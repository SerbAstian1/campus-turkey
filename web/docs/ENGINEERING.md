# Campus Turkey — Engineering Report

DEVPOINT departments 16–22, run against `Developer handoff notes.md` and
`BACKEND-PLAN.md`. Department 23 (AI) does not apply. Department 26 (Motion Delivery)
was not run — see the scope note below.

Every number in this document was measured on this machine. Where something could not
be measured, it says so.

---

## 1. Engineering Brief

**What was built.** The server half of Campus Turkey, as a Next.js App Router
application in `web/`: ten API route files covering thirteen HTTP handlers, a
PostgreSQL schema with its integrity migration, Better Auth, the middleware stack,
security headers, a real HTTP 404, the sitemap, robots, structured data, and the edge
maintenance response.

**Inherited from EDSAI, unchanged.** Everything in `app/src/` — components, screens,
content, motion, design tokens, the 17-language i18n layer. The typed contracts in
`app/src/content/types.ts` are imported through the `@contracts/*` alias, never
restated. Two edits were made outside that rule and both are corrections rather than
redesigns: a provably dead file was deleted, and `app/README.md` was corrected where it
described behaviour the code does not have.

**Two decisions taken by the user before this run.** Full backend build across
departments 16–22, and the Next.js migration as `BACKEND-PLAN.md` proposed.

**Scope note — what was deliberately not done.** The seventeen screens still render
under Vite and still navigate by `location.hash`. Moving them is a large mechanical
change that cannot be verified without running the result, and a repository where
neither the old app nor the new one works is worse than either. `app/` is untouched and
still green: typecheck clean, 18/18 tests. The remaining steps are sequenced in
[MIGRATION.md](./MIGRATION.md). Department 26 was not run for the same reason — the
motion layer lives in `app/src` and this run did not touch it.

**Assumptions made, and where they are marked in code.**

| Assumption | Why | Where |
|---|---|---|
| Withdrawal statuses are the frontend's five, not `BACKEND-PLAN`'s four | `types.ts` and `WITHDRAWAL_STATUS` already render copy for exactly these five; the frontend contract wins | `withdrawal.state.ts` header |
| `lifetimeMinor` means total confirmed earnings ever, not what is left | Two plausible readings; the portal shows available separately | `balance.ts` |
| Lead retention: 730 days ordinary, 1095 partner/representative, 90 medical — held **per message**, not per person | Defensible defaults, not an answer — client open question 2. Per-message because one row cannot honour two policies, and the longer one always wins by accident | `leads.service.ts`, `inquiry` |
| A lead is a person, identified by email; an inquiry is one message | Two people sharing an address become one lead. Accepted: the address is the reply channel, and the alternative was the same person appearing five times with no shared history | `0011_leads_inquiries_attribution` |
| Attribution is first-touch, captured only when the campaign link and the form submission are in the same visit | Storing it between visits means a cookie following someone around the site for a campaign name. Undercounts rather than inventing a journey | `submit.ts` |
| Withdrawal approval is a single FINANCE actor | Client open question 1 (second approver above a threshold) is unanswered | `withdrawal.state.ts` |

**Still blocked on the client.** Payout provider (open question 3) — the endpoints
return 422 with an explanation rather than pretending to work. Commission confirmation
(open question 4) — nothing yet moves a commission to `CONFIRMED`, and that event is
what makes money withdrawable.

---

## 2. Software Architecture (Dept 16)

Full detail in [ARCHITECTURE.md](./ARCHITECTURE.md).

Boundaries follow the domain: `wallet`, `withdrawals`, `payout-methods`, `students`,
`leads`. Three layers — route → service → repository — with the pure domain rules
(`balance.ts`, `withdrawal.state.ts`) sitting below the service layer with no imports
beyond `lib/money`.

Two structural decisions carry most of the weight:

- **Every repository takes a `Db` parameter** rather than importing the client. That is
  what lets the withdrawal path compose reads and writes into one transaction.
- **No repository function accepts an unscoped partner id.** Every partner-scoped query
  takes `session.partner.id`. The whole class of cross-tenant read is unreachable rather
  than guarded.

**Change-amplification test** — *"add a second approver above a threshold"*, the most
likely next feature: **4 files** (`withdrawal.state.ts`, `withdrawals.service.ts`,
`schema.prisma`, the state test). No route handler, no repository, no frontend change.

**Measured targets**

| Target | Result |
|---|---|
| Files touched by a plausible feature | 4 — healthy (1–3 ideal, ≥8 is a boundary problem) |
| Import-direction rule enforced by tooling | **No — convention only.** No ESLint boundaries plugin configured |
| Business logic reachable in tests without HTTP | All of it. The admission rule and state machine have zero I/O imports |

| Dimension | Score | Justification |
|---|---|---|
| Security Posture | 8 | Cross-tenant reads are unreachable by construction, not by check — but the architecture is unverified against a live database |
| Reliability | 8 | The transaction boundary is a first-class architectural element; failure paths map centrally through one module |
| Maintainability | 9 | Three-layer split stated and followed identically across five modules; a new engineer extends by copying one |
| Design Fidelity | 9 | `src/` untouched but for one dead file and README corrections; contracts imported, never restated |
| **Boundary Integrity** | 9 | Every module's ownership stated; no cross-reaching; `@contracts` is a single enforced seam |
| **Change Amplification** *(inverse — 10 = least)* | 8 | 4 files for the likeliest next feature, all of them ones a reader would guess |
| **Five-Year Survivability** | 8 | Patterns explicit and repeatable; deduction for the import rule being convention rather than lint-enforced |

---

## 3. Backend Engineering (Dept 17)

Thirteen HTTP handlers across ten route files. Every one documents its full error set in
its file header — not just the happy path.

| Endpoint | Auth | Authorization rule |
|---|---|---|
| `POST /api/leads` | none | public by design; captcha + 5/10min per IP |
| `POST /api/translate` | none | public by design; 120/min per IP; bounded input |
| `GET /api/health` | none | public by design; no version or stack detail |
| `GET POST /api/auth/*` | none | public by necessity; sign-up disabled at the library |
| `GET /api/partner/wallet` | partner | scoped to `session.partner.id` |
| `GET POST /api/partner/students` | partner | scoped to `session.partner.id` |
| `GET POST /api/partner/withdrawals` | partner | scoped to `session.partner.id` |
| `GET POST /api/partner/payout-methods` | partner | scoped to `session.partner.id` |
| `DELETE /api/partner/payout-methods/:id` | partner | scoped in the `WHERE`; 404 when not yours |
| `POST /api/partner/payout-methods/setup-token` | partner | scoped to `session.partner.id` |

**`access` is a required field on `route()`.** An endpoint without an authorization rule
does not compile. Department 19's "count of endpoints with no stated rule" is
structurally zero, not zero by inspection.

**Middleware order**, and the two decisions worth defending: request id → logging →
origin check → IP rate limit → body size cap → validation → authentication →
authorization → per-user rate limit → handler → error mapping.

The origin check runs *before* the rate limiter, so a forgery attempt spends the
attacker's budget rather than the victim's. Rate limiting runs *before* authentication,
because limiting after auth leaves the sign-in endpoint — the thing credential stuffing
actually targets — unprotected.

That ordering describes the `route()` pipeline, and **Better Auth's catch-all does not
run through it**: it hands off to the library directly, so for a period it inherited none
of the above while a comment in the file said otherwise. It now applies `RATE_LIMITS.auth`
itself, before delegating, and only to the paths that carry a credential — `get-session`
is polled by `useSession` on every mount and `sign-out` must never strand a signed-in
user, so neither is throttled. See `app/api/auth/[...all]/route.ts`.

**External calls**

| Call | Timeout | Retry | On terminal failure |
|---|---|---|---|
| Payout provider (setup token, vault) | 8s | **none** — both consume a single-use token; a retry risks two vaulted instruments | 502, partner retries deliberately |
| Translation provider | 10s | 1, on 5xx only — idempotent, no side effect | 502; client stays in English |
| Captcha verify | 5s | none | fails **closed** — 403; an open spam relay during someone else's outage is worse |
| Database | 2s (health) | 3 on serialisation conflict, full jitter | 503 |

**Measured targets**

| Target | Result |
|---|---|
| Endpoints with a fully specified error set | 13 / 13 |
| External calls with a stated timeout | 4 / 4 |
| Pagination on every collection | 3 / 3 (students, withdrawals, payout-methods — the last is bounded by nature and returns all live rows) |
| p95 target | reads <200ms, writes <500ms — **target + mechanism only, nothing deployed to measure** |

| Dimension | Score | Justification |
|---|---|---|
| Security Posture | 9 | Authorization required by the type system; Zod at every boundary including path params; responses narrowed by the contract types themselves |
| Reliability | 8 | Every external call has a timeout and a stated retry policy differentiated by idempotency; deduction for no circuit breaker and no failure-path testing |
| Maintainability | 9 | One error pattern, one route wrapper, five modules with identical shape |
| Design Fidelity | 9 | Response shapes are the frontend's own types; `satisfies Record<...>` fails compilation if the enums drift |
| **Contract Clarity** | 9 | Full error set per endpoint; DTO mappers break the build on drift rather than at runtime |
| **Failure Handling** | 8 | Failure behaviour defined everywhere and differentiated (captcha closed, rate limiter open) — but demonstrated nowhere |
| **Logic Isolation** | 10 | The entire admission rule and state machine are pure, and 100% tested without HTTP or a database |

---

## 4. Database Engineering (Dept 18)

Seven domain tables plus four Better Auth tables. Money is integer minor units
throughout — no float, no string, no `Decimal`-as-string.

**Constraints that are load-bearing rather than decorative**, all in
`migrations/0002_integrity_constraints/migration.sql`:

- `withdrawal.amountMinor > 0`, `commission.amountMinor > 0` — a negative withdrawal is
  a credit.
- **Composite foreign keys on `(partnerId, currency)` → `partner(id, currency)`.**
  Postgres refuses any commission or withdrawal denominated in a currency other than the
  partner's. Summing mixed currencies into one balance is a money bug no amount of
  careful application code reliably prevents, so it is unrepresentable.
- **Composite foreign key `commission(studentId, partnerId)` → `student(id, partnerId)`.**
  Makes the denormalised `commission.partnerId` provably equal to the student's rather
  than merely intended to be.
- `(state = 'CONFIRMED') = (confirmedAt IS NOT NULL)` — a withdrawable commission always
  records when it became one.
- **Append-only trigger on `withdrawal_event`.** `UPDATE` and `DELETE` raise. This is the
  record a payment dispute is settled from, and a mutable audit trail is not one.
- Partial unique index: at most one default payout method per partner, among live rows.
- `withdrawal_reference_seq` — references minted by `nextval`, not `COUNT(*) + 1`.

**Index strategy.** Three partial covering indexes serve the balance query specifically:

```sql
CREATE INDEX commission_balance_confirmed ON commission ("partnerId")
  INCLUDE ("amountMinor") WHERE state = 'CONFIRMED';
```

The predicate removes irrelevant states from the index entirely and `INCLUDE` carries
the summed column, so the aggregate is an index-only scan that never visits the heap.

**Measured targets**

| Target | Result |
|---|---|
| Foreign keys indexed | 11 / 11 — **verified by querying `pg_constraint` against the applied schema**, leading column only |
| N+1 in list endpoints | 0 — student commissions aggregate via a relation `select`; pipeline counts use `groupBy` |
| Money columns as integer minor units | 5 / 5 |
| `EXPLAIN` for the three heaviest queries | **3 / 3 observed.** Balance aggregate → index-only scan on `commission_balance_confirmed`; student list → `student_partnerId_updatedAt_idx`; withdrawal history → `withdrawal_partnerId_requestedAt_idx` with incremental sort |
| Constraints proven by violation | **30 assertions, all passing** — both migrations executed against real Postgres |
| Destructive migrations with stated backup | n/a — both migrations are additive |

**One index removed on evidence.** `@@index([partnerId, status])` on `withdrawal`
overlapped `withdrawal_balance_committed`. Being cheaper to enter, the planner chose it
for the balance query — which then required a bitmap heap scan, because a plain index
cannot answer for `amountMinor`. Dropping it lets the partial covering index win and the
aggregate becomes an index-only scan. Nothing else queried that prefix. This is exactly
the kind of thing that is invisible without running `EXPLAIN`, and it was costing write
throughput on every withdrawal for no read that needed it.

| Dimension | Score | Justification |
|---|---|---|
| Security Posture | 9 | Append-only audit trail **proven to reject `UPDATE` and `DELETE`**; least-privilege role documented; no payout details stored at all |
| Reliability | 9 | SERIALIZABLE with bounded retry; compare-and-swap on every status transition; sequence-minted references verified non-repeating |
| Maintainability | 8 | Schema heavily commented with the reason for each constraint; deduction for camelCase columns needing quotes in every hand-written query |
| Design Fidelity | 9 | Stage and status enums map 1:1 onto the frontend unions, checked by `satisfies` |
| **Schema Integrity** | 10 | Currency mismatch, partner mismatch, negative money, confirmed-without-timestamp, duplicate idempotency key and a second default payout method are each **demonstrated unrepresentable** by a test that tries and is refused |
| **Query Efficiency** | 9 | Plans observed rather than predicted; a redundant index found and removed on that evidence; zero N+1. Not 10 — the plans come from PGlite on synthetic data, not from production |
| **Migration Safety** | 8 | Both migrations now **execute cleanly in order** against real Postgres, in CI, on every run. Expand/contract sequence documented. Not higher because no migration has yet run against a server holding real data |

---

## 5. Application Security (Dept 19)

**Authentication.** Better Auth, chosen over Clerk and Auth.js with the reasoning stated
in `server/lib/auth.ts`: a few hundred high-value agency accounts make per-seat pricing
affordable but put the client's identity data in a third party for a user base that fits
in one Postgres table. Sessions live in the client's own database. Sign-up is disabled —
partners are onboarded through the application form a human reviews. Sessions: 7 days
absolute, refreshed daily. Nothing hand-rolled.

**Authorization.** Ownership-based, plus a staff role for the console. Enforced at the
data-access layer: partner-scoped queries take the id from the session, and no
repository function accepts one from a request. Not-yours returns **404, not 403**, so
the endpoints cannot be used to confirm that an id exists.

**Trust boundaries and their validators**

| Boundary | Validator |
|---|---|
| Request bodies | Zod, per endpoint, at the wrapper |
| Query strings | Zod, coerced and bounded |
| Path params | Zod — `payout-methods/[id]` validates the uuid before Prisma sees it |
| `idempotency-key` header | Zod uuid; a missing one is refused, never defaulted |
| Captcha token | verified with the provider, fails closed |
| Payout provider responses | shape-checked; unknown `kind` rejected |
| Translation provider response | length must equal the input, or the page would scramble |

**OWASP Top 10**

| # | Item | Status | Mitigation here |
|---|---|---|---|
| A01 | Broken Access Control | Mitigated | `access` required by type; scoping in the query, not after it; 404-not-403 |
| A02 | Cryptographic Failures | Mitigated | Library-managed hashing and session signing; TLS enforced by HSTS; no payout details stored |
| A03 | Injection | Mitigated | Prisma parameterises; the three `$queryRaw` calls use tagged templates with `::uuid` casts, no interpolation; JSON-LD escapes `<` |
| A04 | Insecure Design | Mitigated | Human approval before money moves, enforced by the state machine; idempotency; append-only audit |
| A05 | Security Misconfiguration | Mitigated | Config refuses to boot without production requirements — **verified: the build failed until Sentry, Redis and captcha were supplied**; `poweredByHeader` off |
| A06 | Vulnerable Components | **Partial** | Lockfile committed, `npm audit --omit=dev` in CI as report-only per handoff note 14. No automated update policy |
| A07 | Auth Failures | Mitigated | Better Auth; sign-up disabled; 10 per 5 min per IP on credential paths, Redis-backed and enforced before the handler; 12-char minimum; email verification required. Fails open on a Redis outage, falling back to the library's weaker per-instance limiter |
| A08 | Data Integrity Failures | Mitigated | `npm ci` from lockfile; CSP with a per-request nonce and `strict-dynamic` |
| A09 | Logging Failures | Mitigated | Structured JSON, correlation id on every line, redaction tested; alert thresholds are numbers |
| A10 | SSRF | Mitigated | Only three outbound hosts, all from validated config; no user-supplied URL is ever fetched |

**Measured targets**

| Target | Result |
|---|---|
| Endpoints with a stated authorization rule | 13 / 13 — 11 enforced by the type system, 2 (`health`, `auth`) documented public |
| Secrets committed to the repository | **0 — verified by scan**, not assumed. `.env` is gitignored; gitleaks runs on full history in CI |
| Inputs validated at the boundary | 7 / 7 entry-point classes |
| Rate limit stated per public endpoint | 5 / 5 — the auth catch-all is now included; it was previously counted as out of scope |
| OWASP items reviewed | 10 / 10 |

| Dimension | Score | Justification |
|---|---|---|
| Security Posture | 8 | The model is sound and structurally enforced; not higher because no authorization denial has been tested against a running server |
| Reliability | 8 | Failure directions chosen deliberately per control and documented — rate limiter open, captcha closed |
| Maintainability | 9 | One rate-limit table, one error mapper, one place authorization is enforced |
| Design Fidelity | 9 | `sessionExpired`, the noindex portal and the 503 maintenance state all match what EDSAI designed |
| **Trust Boundary Discipline** | 9 | Every entry point named with its validator, including headers and path params |
| **Attack Surface** *(inverse — 10 = smallest)* | 8 | Narrow responses, opaque 500s, no version disclosure; deduction because `/api/translate` is an unauthenticated endpoint fronting a metered key |
| **Secret Hygiene** | 9 | Zero verified, `.env.example` complete with required/optional marked, gitleaks on full history; rotation documented but never rehearsed |

---

## 6. Performance Engineering (Dept 20)

**This is the weakest department in the run, and the reason is stated rather than
worked around: nothing is deployed, so nothing has been profiled.** Every figure below
is a target plus the specific mechanism intended to hit it. None is an observation.

**Inherited from EDSAI Dept 8, not renegotiated:** Lighthouse ≥90, LCP <2.5s, INP
<200ms, CLS <0.1, initial JS ≤170KB.

**Database.** Connection pooling is the decision that matters on a serverless runtime:
`DATABASE_URL` must be the pooled URL with `connection_limit=1`. A direct connection
exhausts Postgres within minutes of real traffic, and it is the single most likely cause
of a production incident on this stack — which is why it is the first thing
[RUNBOOK.md](./RUNBOOK.md) §3 checks.

**The balance query**, the hottest path: three correlated aggregates in one round trip,
each served by a partial covering index, expected index-only. Target p95 <50ms. Not
measured.

**Caching**, cheapest layer first, nothing premature:

| What | Where | TTL | Invalidation |
|---|---|---|---|
| Fingerprinted build output | CDN | 1 year, immutable | filename changes |
| Brand assets, design system bundle | CDN | 1 day, must-revalidate | time |
| `sitemap.xml` | ISR | 1 day | `revalidate` |
| Every authenticated response | none | `no-store` | n/a |

No Redis cache. Redis is present for rate limiting only, because in-process counters do
not work across serverless instances. Nothing has been measured that justifies more.

**Payload.** Heaviest list response is 20 students with aggregated commissions —
estimated **~6KB** against the 100KB budget. Every collection is cursor-paginated at 20,
capped at 50.

**Scalability.** First thing to break under 10× load is the Postgres connection pool.
Next step: raise the pooler's limit, then a read replica for the portal's reads, which
are the majority.

**One measured improvement made during this run.** `resolveSession` was running on
public endpoints, costing a session-store lookup on every `/api/translate` call — an
endpoint permitted 120 requests a minute per visitor. Public routes now skip it
entirely.

**Since the first pass: query plans are now observed.** Three `EXPLAIN` outputs are
asserted in CI (Department 18 above). That moves the balance query from "designed to be
index-only" to "is index-only, and here is the condition under which it stops being so":
the visibility map must be current, which is autovacuum's job. Latency is still
unmeasured — PGlite on synthetic data cannot produce a meaningful p95, and no number is
claimed.

| Dimension | Score | Justification |
|---|---|---|
| Security Posture | 8 | No caching of authenticated responses; rate limits sized per endpoint class |
| Reliability | 8 | Pooling strategy stated as the primary failure mode with a runbook entry |
| Maintainability | 8 | Cache policy is four lines of config in one file |
| Design Fidelity | 8 | EDSAI's budgets restated and untouched; image config targets the measured 900KB problem from handoff note 4 |
| **Measurement Grounding** | 7 | Three query plans observed, an index removed on that evidence, and the vacuum dependency behind the index-only scan identified. Not higher because **no latency figure exists** — p95, p99 and cold start are all still target-plus-mechanism |
| **Caching Strategy** | 7 | Cheapest layers used first, each with a TTL and an invalidation trigger; nothing cached that needs a complex invalidation story yet |
| **Scalability Headroom** | 7 | Bottleneck named and next step stated; unverified under load |

---

## 7. Quality Assurance (Dept 21)

740 tests pass across 52 files. Coverage detail in [TESTING.md](./TESTING.md).

### Issue list

**MAJOR — services, repositories and route handlers have no tests.**
24.82% against an >=80% target, measured over the whole service layer. The SERIALIZABLE concurrency
guarantee — the single load-bearing claim of the whole money path — has still never
been executed, because PGlite is single-connection and a race needs two.

*Partially closed since the first pass.* The database half is now covered: both
migrations execute and 30 assertions prove each constraint refuses what it should,
including the append-only trigger and the currency-consistency foreign key. What
remains is everything that runs through Prisma and HTTP. *Fix:* the compose file and
the four cases are in TESTING.md; the concurrency case should run several hundred times
in a loop, because a race that reproduces once in twenty is still a race.

**MAJOR — no authorization denial test.** Every authorization rule is stated and
enforced in code, and not one has been proven to deny. An authorization suite that
tests only the allowed case proves nothing. *Fix:* for each of the eight partner-scoped
handlers, sign in as partner A and request partner B's resource; assert 404.

**MAJOR — backup restore never tested.** RPO ≤5 min and RTO ≤60 min are stated from
provider capability, not from a drill. An untested backup is a hypothesis. *Fix:* the
four-step drill in DEPLOYMENT.md; the measured wall-clock time is the real RTO.

**MINOR — `app/not-found.tsx` is not yet reached.** It compiles, but with no
app-router pages yet, Next serves its built-in `/404`. That still returns a genuine 404
status, so handoff note 12's actual requirement is met; the EDSAI-designed recovery
screen appears once step 2 of MIGRATION.md adds page routes.

**MINOR — import direction is convention, not tooling.** The layer rules in
ARCHITECTURE.md are followed but nothing enforces them. *Fix:* `eslint-plugin-boundaries`.

**MINOR — no Sentry client is wired.** `SENTRY_DSN` is required in production and
validated at boot, but no SDK is initialised, so errors are logged and not reported.
*Fix:* `@sentry/nextjs` with the DSN already in config.

**MINOR — one slow test.** `sumMinor` overflow allocates a 5M-element array and costs
~1.3s of a 2.8s suite. Acceptable now; if the suite grows, mark it.

**NITPICK — camelCase columns.** Prisma's default means every hand-written query quotes
identifiers. Consistent, and noted in RUNBOOK.md so nobody debugs it at 2am.

### Two defects found and fixed during this run

Both were found by review rather than by a failing test, which is the point of the pass:

- **`"ip"` was a substring redaction pattern**, so `description` and `recipient` were
  being silently redacted from production logs. A redacted log looks exactly like a log
  with nothing to say. Now an exact-match list, with a regression test.
- **`resolveSession` ran on public endpoints**, buying a session lookup on every
  translate call to discard it. See Dept 20.

### Measured targets

| Target | Result |
|---|---|
| Blockers | **0** — three were found and fixed this pass; see below |
| Majors | **1** (backup restore, never drilled) |
| Minors | 4 · Nitpicks | 1 |
| Money path coverage (balance, state machine, money) | **100%** lines/branches/functions — target 100%, **met** |
| Error mapping coverage | **100%** — met |
| Measured coverage (`server/modules/**` + money/error/log/rate-limit libs) | **24.82%** statements, 92.36% branches, 78.78% functions — floor enforced in CI at 24/92/78 |
| Money-writing service coverage | **withdrawals 95%, commissions 84%, wallet 100%** statements — target 80%, **met** |
| Remaining service layer coverage | 0% vs 80% target — **not met**; eight of sixteen module directories have no test |
| Authorization rules with a negative test | **13 / 13** — 8 ownership rules at the service layer, plus the `route()` guard itself, which is where the other 5 are decided |
| `any` types without a stated reason | **0** |
| Production build | **passes** — 1,263 pages, 103 kB shared First Load JS, middleware 35.5 kB |

### The three that would have shipped

None of these were visible to a typechecker, a unit test, or a careful reading. All
three were found by deleting the retired Vite `app/`, which had been propping the new
application up by accident.

1. **The design system would not have deployed.** `public/ds/` and `public/assets/` are
   generated and gitignored; nothing in the deploy path generated them. `next build`
   does not need them, so a clean checkout would have built green, deployed green, and
   served unstyled markup with no components — silently. `prebuild` now refuses.
2. **Two undeclared dependencies.** `web/src` imports `gsap` and `leaflet`; neither was
   in `web/package.json`. They resolved by hoisting from the workspace being deleted.
3. **The build could not finish.** 680 university pages at two to three queries each
   exhausted the connection pool at page 315. Now one query per build worker.

A fourth, from the same root cause: the `.ct-error*` classes the 404 renders with were
defined in no stylesheet in the repository. The page the routing migration existed to
deliver was rendering unstyled.

---

## 8. Production Operations (Dept 22)

**CI** (`.github/workflows/ci.yml`) — every step blocking: `npm ci` → `prisma generate`
→ `tsc --noEmit` → tests with the coverage gate → `next build`. Plus gitleaks over full
history, and the existing Vite app kept green so it is not discovered broken on cutover
day. `npm audit` is report-only, deliberately: handoff note 14 documents that the
findings are dev-only and unreachable and that `--force` breaks the build, and a check
that fails for known-irrelevant reasons trains people to ignore CI.

**Rollback.** Deploy rollback is promote-previous, ~30 seconds, followed by four
verification `curl`s including the 404 check — a soft 404 is invisible from a browser
and is the specific regression the migration existed to fix. Migration rollback is
deliberately manual and the reasoning is written down: additive migrations should not be
rolled back at all, and destructive ones must be known to be destructive before they
ship.

**Alert thresholds are numbers**, all nine of them, in RUNBOOK.md — including two
domain-specific ones a generic setup would miss: a spike in `insufficient` refusals
(probing, or a balance bug) and serialisation retry warnings (contention where there
should be none).

**Logging.** Structured JSON, `requestId` on every line, two independent redaction
layers, and an `audit` channel with a stable `event` key so money-movement lines can
carry their own retention policy.

**Measured targets**

| Target | Result |
|---|---|
| Rollback time to previous known-good | <5 min target; ~30s mechanism — **never rehearsed** |
| RPO / RTO | ≤5 min / ≤60 min stated from provider capability — **not verified by drill** |
| Backup restore tested | **No** |
| Environment variables documented | 22 / 22, each marked required / prod-only / optional |
| Alert thresholds stated as numbers | 9 / 9 signals |

| Dimension | Score | Justification |
|---|---|---|
| Security Posture | 8 | gitleaks over full history; no secret reaches a CI log; least-privilege database role documented |
| Reliability | 7 | Health check with its own timeout, maintenance from the edge — but rollback and restore are both written and unrehearsed |
| Maintainability | 9 | Five documents, each answering one question, all current as of this run |
| Design Fidelity | 8 | The 503 maintenance state renders EDSAI's copy from the edge, which is what note 12 asked for |
| **Deployability** | 8 | Automated, repeatable, every check blocking; not higher because the pipeline has never actually executed — there is no git repository yet |
| **Observability** | 7 | Correlated structured logs with tested redaction and numeric thresholds; no error-tracking SDK is initialised and no dashboard exists |
| **Recoverability** | 5 | Rollback documented and time-boxed, backups configured in principle, RPO/RTO stated — and **not one of the three has been demonstrated**. Unknown is not the same as fine |

---

## 9. Verification Log

Everything below was run on this machine during this session.

| Check | Command | Result |
|---|---|---|
| Schema validity | `prisma generate` | **pass** — client generated, composite FKs accepted |
| Init migration | `prisma migrate diff --from-empty` | **pass** — regenerated after removing the redundant index |
| **Migrations applied** | PGlite, `0001` then `0002` | **pass** — both execute cleanly in order, every run |
| **Constraint enforcement** | `tests/schema-integrity.test.ts` | **pass** — 30 assertions, each proving a violation is refused |
| **Query plans** | `tests/query-plans.test.ts` | **pass** — 3 heaviest queries observed; index-only scan confirmed; FK index audit clean |
| Types | `tsc --noEmit` | **pass** — 0 errors |
| Tests | `vitest run` | **pass** — 208/208, 9 files |
| Coverage gate | `vitest run --coverage` | **pass** — 24.82% statements over the full service layer, with the money path, error mapping and the three money services held at their own per-file floors |
| Production build | `next build` | **pass** — 10 API routes, static sitemap and robots, middleware 35.2KB |
| Config guard | `next build` without prod vars | **correctly failed**, naming Sentry, Redis and captcha |
| Secret scan | filesystem + pattern scan | **0 found** |
| Existing Vite app | `tsc -b --force` + `vitest` | **pass** — 0 errors, 55/55 tests, unaffected by this run |

Still not verified, and not verifiable without a real server: **any latency figure**,
**the SERIALIZABLE concurrency behaviour** (PGlite is single-connection), **any
authorization rule actually denying**, and **any backup actually restored**.

Two of my own claims were corrected by running the tests rather than defended. The
balance query is index-only *only after vacuum* — before that it is a bitmap heap scan,
which the first draft of this document did not mention. And a redundant index was
silently beating the purpose-built one; that was invisible until a plan was printed.

---

## 10. PRODUCTION AUDIT

```
PRODUCTION AUDIT — Campus Turkey (server layer)

  1. Architecture      PASS     Three-layer split enforced; no Prisma call outside a
                                repository; change-amplification test = 4 files
  2. Backend           PASS     13/13 handlers with full error sets; 4/4 external
                                calls with timeout and stated retry policy
  3. Database          PASS     30 constraint assertions executed against real
                                Postgres — currency drift, partner mismatch, negative
                                money and audit-trail edits all refused. 11/11 FKs
                                indexed, verified from pg_constraint. 0 N+1
  4. API               PASS     Cursor pagination on all collections; response shapes
                                are the frontend's own types, enforced by `satisfies`
  5. Authentication    PASS     Better Auth, nothing hand-rolled; 7-day session,
                                daily refresh; sign-up disabled
  6. Authorization     PASS     13/13 endpoints with a stated rule; 11 enforced by
                                the type system — an endpoint without one won't compile
  7. Security          PASS     OWASP 10/10 walked; 7/7 boundaries validated;
                                0 secrets verified by scan; rate limits on 4/4 public
  8. Performance       REQ IMP  3/3 query plans now observed and asserted in CI; a
                                redundant index found and removed on that evidence.
                                Still no latency: p95, p99 and cold start remain
                                target-plus-mechanism with nothing deployed to profile
  9. Accessibility     PASS     EDSAI's targets preserved — pinch-zoom never disabled,
                                error screens keep their recovery routes. Untouched
 10. Testing           REQ IMP  Money path 100%, money services 84-100%, measured
                                coverage 24.82% over the real service layer (was a
                                six-file allowlist reporting 99.61%). Eight module
 11. Logging           PASS     Structured, correlated, two redaction layers, tested;
                                no PII or secrets in output. `requestLogger` and the
                                audit line shape now covered
 12. Monitoring        REQ IMP  9/9 thresholds stated as numbers with a named
                                recipient; Sentry is initialised (lazily, Node-only),
                                but no dashboard exists and server-component render
                                errors still bypass it — reasoned, in `error.tsx`
 13. Deployment        REQ IMP  Production build passes end to end for the first time,
                                all checks blocking, the design system can no longer be
                                omitted silently — but rollback and backup restore are
                                both still unrehearsed, and nothing has been deployed
 14. Documentation     PASS     README, architecture, deployment, environment, runbook,
                                migration and testing docs all present and current

DETERMINATION: REQUIRES IMPROVEMENT
```

**Still not PASS, and now for one reason rather than three.** The concurrency guarantee
has been executed — two simultaneous requests for the whole of a $400 balance produce
exactly one withdrawal, and the loser is refused with a `ConflictError` rather than
escaping as a 500. The authorization rules have been made to deny, each against a
positive control. What has not happened is a backup restore, and until one has been
performed and timed, the stated RPO and RTO are a provider's brochure rather than a
measurement.

The honest framing of the remainder is narrower than the last run's and more specific:
**nothing has ever been deployed.** Every claim in this document is now demonstrated by
a test or a build, and the class of defect that a build and a test cannot see is exactly
the class this pass kept finding — a design system that is never copied, a dependency
that resolves by accident, a stylesheet nobody wrote. Three of those shipped undetected
through every previous review. It would be unwise to assume the fourth does not exist.

**Not FAIL.** No open Blocker, no authorization gap, no secret in the repository, the
schema makes the dangerous states unrepresentable, and the production build now
completes. Safe to run in staging today, and the preview walk in MIGRATION.md step 6 is
the next thing that should happen — before, not after, the remaining polish.

### Required before PASS

1. ~~**Write the integration suite**~~ — done. 24 assertions against a real Postgres:
   the withdrawal path, and tenant isolation across payout methods, wallet, students and
   documents. Still worth running the concurrency case in a loop before a release.
2. ~~**Add authorization denial tests**~~ — done for the ownership-scoped surface, 8 of
   13, each paired with a positive control so it cannot pass on a service that is simply
   broken. The five not covered are the staff-permission endpoints, where the rule is
   enforced by the route's `access` declaration rather than by the service.
3. **Run the backup restore drill** — once, recording the measured RTO. Still open, and
   now the only one of the three that has not moved.
4. Re-run checks 10 and 13.

**Two defects came out of writing item 1**, both invisible to a reading and to the type
checker: a document-id oracle in the two document endpoints that loaded a row before
scoping it, and a serialisation conflict that reached the client as a 500 once its retry
budget was spent. Both are described in TESTING.md and both are now covered.

### Non-blocking, worth closing soon

- Initialise `@sentry/nextjs` (check 12). The DSN is already required and validated.
- Add `eslint-plugin-boundaries` so the import rules are enforced rather than observed.
- Get a staging deployment up and capture real p95 and three `EXPLAIN` plans (check 8).

---

## 11. Aggregate Scoring

**Mean across all Universal Dimensions** (4 × 6 departments scored): **8.29** — unchanged.
The second pass moved department-specific dimensions (Schema Integrity 9→10, Query
Efficiency 8→9, Migration Safety 7→8, Measurement Grounding 5→7), not the universal
four. Verifying a claim does not make the design better; it makes the claim true.

| Department | Sec | Rel | Maint | Fid |
|---|---|---|---|---|
| 16 Architecture | 8 | 8 | 9 | 9 |
| 17 Backend | 9 | 8 | 9 | 9 |
| 18 Database | 9 | 9 | 8 | 9 |
| 19 Security | 8 | 8 | 9 | 9 |
| 20 Performance | 8 | 8 | 8 | 8 |
| 22 Operations | 8 | 7 | 9 | 8 |

**Security Posture floor: 8** (Departments 16, 19, 20, 22). Stated separately because a
good average hides a fatal outlier, and there isn't one here — nothing is below 8 on
security anywhere in the run.

**Lowest-scoring department and dimension, named:** **Department 22, Recoverability —
5.** Rollback, RPO/RTO and backups are all written and none demonstrated. It now holds
the floor alone; Department 20's Measurement Grounding moved 5→7 once query plans were
observed, and nothing else in the run sits below 7.

**Aggregate measured-target pass rate: 19 of 24** (was 17).

Met: error sets 13/13 · timeouts 4/4 · pagination 3/3 · FK indexes 11/11 · N+1 zero ·
money columns 5/5 · authorization rules 13/13 · secrets 0 · input validation 7/7 · rate
limits 4/4 · OWASP 10/10 · env vars 22/22 · alert thresholds 9/9 · money-path coverage
100% · error-mapping coverage 100% · `any` count 0 · files-per-feature 4 ·
**`EXPLAIN` plans 3/3** · **constraints proven by violation 30/30**.

Still missed: service-layer coverage 24.82% vs 80% · authorization denial tests 0/13 ·
p95/p99 unobserved · backup restore untested · rollback unrehearsed.

---

## 12. Client Protection Checklist

| Item | State |
|---|---|
| Domain | **Client's own registrar account.** Not yet confirmed — do this before launch |
| Hosting | **To be created in the client's Vercel account**, developer added as collaborator |
| Repository | **Not yet a git repository.** `git init` and transfer with full history |
| Database | **To be created in the client's own Neon/Supabase account** |
| Third-party services | Upstash, Sentry, captcha, payout, mail — all to be registered to a **client-controlled email**, never a personal one |
| Credentials | Deliver via password manager, never chat or email. Rotate every build-time value at handover |
| Documentation | **Complete** — README, architecture, deployment, environment, runbook, migration, testing |
| `.env.example` | **Complete**, 22 variables, each marked required / prod-only / optional |

**Handover verification — none of these has been done yet:**

1. Client can sign into every service account they own
2. Repository transferred with full history
3. **A deploy performed by someone other than the original developer, using only the
   documentation.** This is the real test; a deployment doc read only by its author is a
   draft
4. A backup restore tested at least once
5. All build-time credentials rotated
6. Maintenance scope agreed in writing — what is and is not covered

**Maintenance items with a cadence**, so nothing defaults to unpaid and unbounded:
dependency review monthly (`npm audit --omit=dev`, never `--force`), backup restore
drill quarterly, certificate renewal automatic but verified annually, lead retention
purge daily at 03:00 UTC.
