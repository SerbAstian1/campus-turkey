# Testing

## Where coverage actually stands

| Layer | Target | Actual | Status |
|---|---|---|---|
| Money path — balance, admission rule, state machine, money primitives | 100% | **100%** | met |
| Error mapping (`lib/errors.ts`) | 100% | **100%** | met |
| Log redaction (`lib/logger.ts`) | — | 85% lines, 96% branches | pure rules fully covered |
| Rate-limit keying (`lib/ratelimit.ts`) | — | 58% lines, 86% branches | pure rules fully covered |
| **Schema constraints and triggers** | all enforced | **30 assertions, all passing** | met — executed, not asserted |
| **Query plans** | 3 heaviest | **3 observed + FK index audit** | met |
| **Withdrawal service — concurrency, idempotency, state machine** | executed | **14 assertions against real Postgres** | met |
| **Tenant isolation — payout methods, wallet, students, documents** | every rule denied at least once | **10 assertions, each with a positive control** | met |
| **Money-writing services — withdrawals, commissions, wallet** | **>=80%** | **95%, 84%, 100%** statements | met |
| **Remaining services, repositories, route handlers** | **>=80%** | 0% — eight of sixteen module directories have no test at all | **NOT MET — QA issue #1** |
| Measured coverage across `server/modules/**` + money/error/log/rate-limit libs | >=80% | **24.82% statements, 92.36% branches, 78.78% functions** | not met — this is the honest scope figure |

**740 unit tests across 52 files, plus 24 integration tests against a real Postgres.**

The integration suite closed the gap that every previous pass had to leave open. PGlite is
single-connection, so the write skew that SERIALIZABLE exists to prevent could not be
*created* under it, let alone observed — the concurrency claim rested entirely on reading
the code. It has now been run: two simultaneous requests for the whole of a $400 balance
produce exactly one withdrawal, and the loser is refused with a `ConflictError` rather than
escaping as a 500.

Run it with `npm run test:integration` against a branch database. **It also runs in CI**,
as its own job against a Postgres service container the workflow starts — see the
`integration` job in `.github/workflows/ci.yml`. It is still not part of `npm test`:
`vitest.config.ts` excludes `tests/integration/**` so the unit run cannot pick it up and
fail on the fake `DATABASE_URL` it injects.

Until recently it ran only on request, which is what audit finding M3 was about — the
money path's only executable guarantees depending on somebody remembering a command.

Two of those rows changed from "not measured" by running the migrations against
**PGlite** — Postgres compiled to WebAssembly, so a real planner and real constraint
enforcement with no Docker and no service to start. That closes the two gaps that
previously rested entirely on reading SQL.

The withdrawal service — the one that decides about money — is now covered end to end by
`tests/integration/withdrawals.test.ts`. What remains untested is every *other* service,
repository and route handler: leads, commissions, payout methods, the webhook receiver.
That is still the largest open gap and it is still why the Production Audit cannot return
PASS.

## What a real database found that reading could not

Six defects surfaced only once the app was pointed at a live Postgres and driven with
real sessions. Each had been read past repeatedly:

1. **A document id oracle.** `downloadUrl` and `confirmUpload` loaded the document by id
   and *then* checked the application, so a document that exists but is not yours
   answered "we could not find that application" while an invented id answered "we could
   not find that document". Both are 404s, which is why it survived review — but the two
   messages differ, and that difference tells an outsider which ids are real. Fixed by
   scoping the lookup instead of checking after it, so there is one refusal and no second
   message to keep in step. Found by asserting the two answers are identical.
2. **A serialisation conflict could reach the client as a 500.** When all three attempts
   of a `serializable()` transaction lost, the raw `PrismaClientKnownRequestError`
   propagated. A write conflict is transient and is the current state refusing the
   request — a 409 — and reporting it as a server error tells a partner the system is
   broken when the database has done exactly what it promises. Now a `ConflictError`,
   with the decision pinned by `db.retry.test.ts` because reproducing it needs a race to
   lose three times in a row.
3. **Every staff endpoint returned 403 to every role.** `staffRole` is not part of Better
   Auth's own schema, and the library returns only the fields it knows about on
   `session.user` — so the role was correct in the database and `undefined` in the
   session. Fixed by declaring it in `user.additionalFields` with `input: false`, which
   is what stops it also becoming a self-promotion endpoint.
4. **The app refused to boot on a correct `.env`.** Optional variables left blank arrive
   as `""`, which `z.string().url().optional()` rejects rather than skips.
5. **Scripts run under plain `node` never loaded `.env` at all.**
6. **`pgbouncer=true` cost 6.5x on every query** against Neon's pooler, which has not
   needed that flag since 2024.

None of these are visible to a type checker, a unit test, or a careful reading. They are
the argument for this suite existing.

## What PGlite already verifies

`tests/schema-integrity.test.ts` applies `0001_init` and `0002_integrity_constraints`
in order — the first time either had ever been executed — and then proves each
guarantee by trying to violate it:

- money cannot be zero or negative, on either table
- a commission or withdrawal in a currency the partner does not hold is **rejected by
  the composite foreign key**, not by application code
- a commission whose partner is not its student's partner is rejected
- `CONFIRMED` without a timestamp, and a timestamp without `CONFIRMED`, both rejected
- a second withdrawal with the same idempotency key is rejected; the same key under a
  *different* partner is accepted
- a second default payout method is rejected; archived ones do not block
- `UPDATE` and `DELETE` on `withdrawal_event` both raise, and the rows survive
- a payout method referenced by a withdrawal cannot be hard-deleted

`tests/query-plans.test.ts` seeds ~8,000 commissions and 12,000 withdrawals, vacuums,
and asserts the plan shape for the three heaviest queries plus a foreign-key index
audit.

**One caveat that belongs in the runbook, not just here:** the balance aggregate is an
index-only scan *only because vacuum has populated the visibility map*. Before
vacuuming, the identical query plans as a bitmap heap scan. In production that is
autovacuum's job — disable it on these tables and the hottest financial query silently
gets slower.

The coverage gate in `vitest.config.ts` instruments the whole of `server/modules/**`
plus the four `server/lib` files that carry the money, error, logging and rate-limit
rules. Nothing is excluded for lacking a test.

It used to instrument six hand-picked files, and v8 prints its summary row as
`All files` — so the gate reported **99.61%** over those six and read as though it
described the server. That gap is audit finding M2. The number is now 24.82%, which is
worse to look at and true, and the per-file thresholds that held the money path at 100%
are still there underneath it.

## What the unit suite does cover, and why those things

The domain core is pure by construction — no database, no HTTP — specifically so that
the decisions that cost money can be tested exhaustively:

- **`withdrawal.state.test.ts`** walks all 25 `(from, to)` pairs rather than the ones
  someone remembered. It proves a `PARTNER` actor can drive no transition at all, that
  no path reaches `PAID` without passing through `APPROVED`, and that `isCommitted`
  agrees with the partial index predicate in migration `0002`.
- **`balance.test.ts`** tests every refusal, the off-by-one at the balance ceiling, and
  refusal *precedence* — a suspended partner with an insufficient balance must be told
  they are suspended, because the wrong message sends them to the wrong support queue.
- **`errors.test.ts`** throws eight hostile things (a Prisma error with a file path, an
  `ECONNREFUSED` with a private IP, a bare string, `null`) and asserts none of it
  reaches the response body.
- **`logger.test.ts`** asserts the redaction claim against the shapes actually logged.

## The integration suite that needs writing

Needs a disposable Postgres. `docker-compose.test.yml`:

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: test
      POSTGRES_DB: campus_turkey_test
    ports: ["5433:5432"]
    tmpfs: [/var/lib/postgresql/data]   # in-memory; the suite drops it anyway
```

```bash
docker compose -f docker-compose.test.yml up -d
DATABASE_URL=postgresql://postgres:test@localhost:5433/campus_turkey_test \
DIRECT_DATABASE_URL=postgresql://postgres:test@localhost:5433/campus_turkey_test \
  npx prisma migrate deploy
```

### The four cases that matter most

**1. Concurrent withdrawal admission.** The one this whole design exists for.

Seed a partner with exactly $400 confirmed. Fire two simultaneous requests for $400 with
*different* idempotency keys. Assert: exactly one succeeds, one gets 409, and
`SUM(amountMinor) WHERE status <> 'REJECTED'` equals 40000 — not 80000.

Without `SERIALIZABLE` this test fails. It is the regression test for the entire
isolation argument in `lib/db.ts`, and it should be run a few hundred times in a loop,
because a race that reproduces once in twenty is still a race.

**2. Idempotent replay.** Same partner, same key, ten concurrent requests. Assert
exactly one row exists and all ten responses carry the same withdrawal id.

**3. Authorization denial.** For every partner-scoped endpoint, sign in as partner A and
request partner B's resource by id. Assert 404 — not 403, because 403 confirms the id
exists. **An authorization suite that only tests the allowed case proves nothing**; the
denial case is the test.

Endpoints to cover: `GET /api/partner/wallet`, `GET|POST /api/partner/students`,
`GET|POST /api/partner/withdrawals`, `GET|POST /api/partner/payout-methods`,
`DELETE /api/partner/payout-methods/:id`, `POST .../setup-token`.

**4. The append-only trigger.** Attempt `UPDATE withdrawal_event SET note = 'x'` and
`DELETE FROM withdrawal_event` directly. Assert both raise. This is the one guarantee
that is enforced by the database rather than by code, so it is the one that a future
ORM change could silently remove.

### Also worth covering

- A commission reversed after being withdrawn against produces `isOverdrawn`, logs at
  error level, and refuses the next withdrawal with `balance_under_review`.
- The `route()` wrapper: missing `Origin` on a mutation → 403; oversized body → 400;
  malformed JSON → 400; a valid partner session on a `staff` endpoint → 403.
- `GET /api/partner/students` issues a bounded number of queries regardless of page
  size — the N+1 regression test.
- Currency mismatch is refused by Postgres, not just by the service: insert a commission
  in EUR for a USD partner and assert the composite foreign key rejects it.

## Running

```bash
npm test                # unit, 165 tests
npm run test:coverage   # with the gate
npm run test:watch
```
