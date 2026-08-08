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
| **Services, repositories, route handlers** | **≥80%** | **0%** | **NOT MET — QA issue #1** |
| Overall statement coverage | ≥80% | ~17% lines | not met |

208 tests pass across nine files.

Two of those rows changed from "not measured" by running the migrations against
**PGlite** — Postgres compiled to WebAssembly, so a real planner and real constraint
enforcement with no Docker and no service to start. That closes the two gaps that
previously rested entirely on reading SQL.

The number that still matters is the one in bold: **no service, repository or route
handler has a test.** Those need Prisma against a real server, and PGlite is
single-connection so it cannot exercise the SERIALIZABLE concurrency behaviour either.
That remains the largest open gap and it is why the Production Audit cannot return PASS.

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

The coverage gate in `vitest.config.ts` covers only the modules that are unit-testable,
at high thresholds. A global threshold that can never pass is a threshold that gets
deleted in the first red build — this way the gate is real for what it covers and the
gap is a number here rather than a silence.

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
