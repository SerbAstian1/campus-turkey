# Campus Turkey — server

Next.js (App Router), TypeScript, PostgreSQL, Prisma, Better Auth.

This is the server half of the project. The screens still live in `../app/` and still
render under Vite; see [docs/MIGRATION.md](./docs/MIGRATION.md) for what remains and why
it was left in a working state rather than half-moved.

## Running it

```bash
cd web
npm install
cp .env.example .env      # then fill in DATABASE_URL, DIRECT_DATABASE_URL, SESSION_SECRET
npx prisma migrate dev    # creates the schema, then applies the integrity constraints
npm run dev
```

Node 20 or newer. You need a Postgres — a local one, or a free Neon branch. The app
refuses to boot without the required variables rather than failing on the first request
that needed one; the error names every variable that is missing.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next dev server |
| `npm run build` | `prisma generate` then `next build` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest — 165 unit tests |
| `npm run test:coverage` | with the coverage gate |
| `npm run db:migrate` | `prisma migrate deploy` — production |
| `npm run db:migrate:dev` | `prisma migrate dev` — local |

## The API

| Endpoint | Auth | Rule |
|---|---|---|
| `POST /api/leads` | none | public; captcha + 5 per 10 min per IP |
| `POST /api/translate` | none | public; 120/min per IP |
| `GET /api/health` | none | public; no version or stack detail |
| `/api/auth/*` | none | Better Auth; sign-up disabled |
| `POST /api/webhooks/payouts` | HMAC | signature over `${timestamp}.${body}`; no session |
| `GET /api/cron/purge-leads` | bearer | `CRON_SECRET`, compared in constant time |
| `GET /api/partner/account` | partner | the session's own partner; no id parameter exists |
| `GET /api/partner/wallet` | partner | scoped to `session.partner.id` |
| `GET POST /api/partner/students` | partner | scoped to `session.partner.id` |
| `GET POST /api/partner/withdrawals` | partner | scoped to `session.partner.id` |
| `GET POST /api/partner/payout-methods` | partner | scoped to `session.partner.id` |
| `DELETE /api/partner/payout-methods/:id` | partner | scoped; 404 when not yours |
| `POST /api/partner/payout-methods/setup-token` | partner | scoped |
| `GET /api/staff/withdrawals` | staff | SUPPORT, FINANCE, ADMIN — read the queue |
| `POST /api/staff/withdrawals/:id` | staff | **FINANCE or ADMIN** — approve, reject, settle |
| `GET /api/staff/commissions` | staff | SUPPORT, FINANCE, ADMIN |
| `POST /api/staff/commissions` | staff | **FINANCE or ADMIN** — records a liability |
| `POST /api/staff/commissions/:id` | staff | **FINANCE or ADMIN** — confirm or reverse |
| `PATCH /api/staff/students/:id` | staff | SUPPORT, FINANCE, ADMIN — pipeline stage |
| `GET /api/staff/leads` | staff | SUPPORT, FINANCE, ADMIN; medical payloads gated |

Every endpoint's full error set is documented in the header comment of its route file.

**No endpoint lacks an authorization rule, and none can.** `access` is a required field
on `route()`; an endpoint without one does not compile.

## The three things that matter most

1. **The withdrawal transaction.** `server/modules/withdrawals/withdrawals.service.ts`.
   Runs at SERIALIZABLE with bounded retry. Replay check first, balance recomputed
   inside the transaction that writes the row, idempotency key unique per partner. The
   reasoning for the isolation level is in `server/lib/db.ts`.
2. **The audit trail.** `withdrawal_event` is append-only, enforced by a Postgres
   trigger that no ORM can bypass. This is what settles a payment dispute.
3. **Payout details are never stored.** Only an opaque provider token and a masked
   label. There is no function in this codebase that accepts an IBAN.

## Documentation

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) — boundaries, layers, import rules
- [DEPLOYMENT.md](./docs/DEPLOYMENT.md) — deploy, rollback, backups, RPO/RTO
- [RUNBOOK.md](./docs/RUNBOOK.md) — alert thresholds and the six likeliest failures
- [MIGRATION.md](./docs/MIGRATION.md) — what remains of the Vite → Next.js move
- [TESTING.md](./docs/TESTING.md) — coverage as it actually stands, and the gap
- [.env.example](./.env.example) — every variable, its purpose, whether it is required

## Known gaps

Stated here rather than discovered later:

- **No integration tests.** Services, repositories and route handlers are at 0%
  coverage against an ≥80% target. The four cases that matter and the compose file to
  run them are in [TESTING.md](./docs/TESTING.md).
- **Backup restore is untested.** The procedure and the drill are in
  [DEPLOYMENT.md](./docs/DEPLOYMENT.md). An untested backup is a hypothesis.
- **Payouts are unconfigured.** Blocked on the client choosing a provider. The endpoints
  return 422 with an explanation rather than pretending to work.
- **Commission confirmation has no path in.** Nothing yet moves a commission from
  `PENDING` to `CONFIRMED`, and that event is what makes money withdrawable. Blocked on
  the client answering who records it.
