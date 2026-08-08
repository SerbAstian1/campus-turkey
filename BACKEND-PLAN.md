# Campus Turkey — backend plan

Engineered under DEVPOINT (`.claude/skills/devpoint/`), against the requirements in
`Developer handoff notes.md`. This document exists so the build starts from decisions
already made rather than re-deriving them.

**Status: superseded — the server half is built, in `web/`.**

Read [`web/docs/ENGINEERING.md`](web/docs/ENGINEERING.md) instead of this file. It is
the report of what was actually built, with measured results and a Production Audit that
returned **REQUIRES IMPROVEMENT** (three open Major issues, all in testing and
operations — no Blockers).

This document is kept because its reasoning is still the reasoning. Three things in it
turned out differently in the build, and where they conflict, the build is right:

1. **Withdrawal statuses.** This plan proposed `requested → approved → sent → settled |
   failed`. The shipped frontend type is `Requested | Approved | Processing | Paid |
   Rejected`, and `WITHDRAWAL_STATUS` in `features/portal/withdrawals.ts` already
   renders copy for exactly those five. The frontend contract won.
2. **Concurrency control.** This plan proposed `SELECT … FOR UPDATE` on the partner row.
   The build uses `SERIALIZABLE` instead, so that a future second write path against the
   same balance inherits the guarantee rather than having to remember the lock. The
   reasoning is in `web/server/lib/db.ts`.
3. **Routing.** The move to real routes is done on the server — real 404, per-route
   metadata, sitemap, JSON-LD, edge 503. The seventeen screens still navigate by hash;
   that step is sequenced in [`web/docs/MIGRATION.md`](web/docs/MIGRATION.md).

The four open questions at the end of this document are still open, and two of them
block real functionality.

---

## The decision that gates everything

Handoff note 6 calls hash routing "the most expensive omission in this document", and
note 12 requires a real HTTP 404 — which a hash-routed SPA cannot return, because every
address resolves to the same 200.

**Resolved: move to real routes.** The visual and motion parity built against the
design system is kept in full; only the URL layer changes.

| Was | Becomes |
|---|---|
| `#/study` | `/study` |
| `#/university/bo-azi-i-university` | `/universities/bo-azi-i-university` |
| `#/service/medical` | `/services/medical` |
| `#/blog/<slug>` | `/resources/<slug>` |
| `#/portal/dashboard` | `/portal/dashboard` (noindex, auth-gated) |

Slugs stay exactly as the prototype generates them (`content/universities.ts`). They are
poor — Turkish letters drop out — but they are the published addresses. Improve them
later behind 301s, never by swapping the rule.

### What this costs on the front end

The design system bundle is a classic script that reads a global `React`
(`src/ds/load.ts`). Under SSR it must not run on the server: keep the loader
client-only, render the shell server-side, and hydrate once the bundle resolves. The
boot screen in `index.html` already covers exactly that window.

---

## Stack

Inherited where EDSAI decided; chosen only where nothing was.

| Layer | Choice | Why |
|---|---|---|
| App | Next.js, App Router | Note 6 needs per-route metadata, sitemap, JSON-LD; note 12 needs real 404/503. Vite SSR would do the first, not the second, as cleanly. |
| API | Route handlers + a service layer | One deployable. Split out only if a workload demands it. |
| DB | PostgreSQL | Money needs transactions and constraints. |
| ORM | Prisma | Migrations are the audit trail for schema. |
| Validation | Zod at every trust boundary | Not just forms — every request body, every provider webhook. |
| Auth | Better Auth | Self-hosted sessions, no per-seat cost for a partner portal of this size. Note 12's `sessionExpired` hangs off refresh failure. |
| Payouts | Wise Platform or Airwallex | Vaulted tokens, per note 3. |
| Mail | Resend or Postmark | Transactional only. |
| Hosting | Vercel + Neon/Supabase | Edge 404/503 without an origin round trip. |

---

## Pipeline (DEVPOINT 16→23)

Each department's output is the next one's input. Run in order.

### 16 — Architecture
Module boundaries outside `src/`. `src/` stays EDSAI's; the server owns `app/api/`,
`server/`, `prisma/`. The two meet at typed contracts in `src/content/types.ts` —
already written, already shared. Import them server-side; do not restate them.

### 17 — Backend engineering
Contracts, in dependency order:

- `POST /api/leads` — Apply, Contact, Partner, Representative. One table, discriminated
  by `kind`. Rate limited + captcha (note 13).
- `POST /api/translate` — keyed provider proxy. The client already calls this via
  `CT_TRANSLATE_ENDPOINT`; the shape it expects is in `app/public/site/i18n.js`.
- `GET /api/partner/students` · `POST /api/partner/students`
- `GET /api/partner/wallet`
- `POST /api/partner/withdrawals` — see below, this is the dangerous one.
- `GET/POST/DELETE /api/partner/payout-methods`
- `POST /api/partner/payout-methods/setup-token`

`src/features/portal/withdrawals.ts` and `payouts.ts` are already written against these
shapes and document what the server must enforce. Read them before writing the server —
they are the contract, not a suggestion.

### 18 — Database engineering

Core tables. Money in integer minor units everywhere; never a float, never a string.

```
partner            id, org, person, email, territory, manager_id, created_at
student            id, partner_id, name, program, university_slug, stage, updated_at
commission         id, student_id, amount_minor, currency, state, confirmed_at
payout_method      id, partner_id, kind, provider_token, masked_detail, is_default
withdrawal         id, partner_id, amount_minor, currency, status,
                   idempotency_key UNIQUE, provider_ref, requested_at
withdrawal_event   id, withdrawal_id, from_status, to_status, actor_id, at   -- append-only
lead               id, kind, payload jsonb, consent_at, retention_until, created_at
```

Constraints that are load-bearing, not decoration:

- `withdrawal.idempotency_key` UNIQUE — this is what makes a retry safe. Note 2.
- `withdrawal.amount_minor > 0`
- `commission.state` transitions forward only.
- `withdrawal_event` has no UPDATE or DELETE grant. Note 2: never update a payout in place.
- Index `student(partner_id, stage)`, `withdrawal(partner_id, requested_at DESC)`.

### The withdrawal transaction — the one place a bug costs real money

```
BEGIN
  SELECT ... FOR UPDATE on partner            -- serialise concurrent requests
  available := SUM(confirmed commission) - SUM(non-failed withdrawals)
  IF requested > available      -> 409, no write
  INSERT withdrawal (status='requested', idempotency_key)
    ON CONFLICT (idempotency_key) DO NOTHING  -- replay returns the original
  INSERT withdrawal_event (null -> 'requested')
COMMIT
```

The client-side ceiling in `WithdrawForm` is a courtesy to the reader. It is not a
control and must never be treated as one.

Status model is `requested → approved → sent → settled | failed`. A human at Campus
Turkey approves before money moves — the UI already promises "reviewed the same working
day", so the state machine has to be able to keep that promise.

### 19 — Application security
OWASP pass. Session cookies `HttpOnly; Secure; SameSite=Lax`. CSRF on every mutation.
Rate limits on `/api/leads` and `/api/translate`. CSP once assets are self-hosted
(note 4). **If you add `?returnTo=` to the portal sign-in, reject any target that does
not start with a single `/`** — note 14 flags exactly that advisory class.

### 20 — Performance
Note 4 measured it: ~900 KB of decorative raster on the critical path. Generate delivery
variants (~440px lockup, ~220px mark), AVIF/WebP with PNG fallback, `width`/`height`/
`decoding="async"` on every brand `<img>`. Swap OpenStreetMap for a paid tile host
(note 13). Ship reviewed static locale files to delete the translation sweep entirely
(notes 1, 7, 8).

### 21 — Quality assurance
Critical-path coverage first: the withdrawal transaction under concurrency, idempotent
replay, balance recomputation, auth guards. The 18 existing content tests stay.

### 22 — Production operations
Real 404 and 503-with-`Retry-After` from the edge, so maintenance renders even when the
app bundle does not (note 12). Error tracking wired to `RouteBoundary`; suppress the
"Technical detail" toggle in production. Backups with a stated RPO/RTO.

### 23 — AI engineering
Not required. Skip unless asked.

---

## Then: the Production Audit gate

DEVPOINT closes with a gate returning PASS / REQUIRES IMPROVEMENT / FAIL. A FAIL blocks
the production-ready claim. The payout paths are where it will fail if any of
server-side balance, idempotency, or the append-only audit trail is missing.

---

## Open questions for the client

1. **Who approves withdrawals**, and is there an amount above which a second approver is
   required?
2. **Retention period** for lead data — the medical desk collects health information
   (note 13).
3. **Payout provider** — Wise, Payoneer or a mobile-money aggregator? Decides the vault
   integration and most of the country coverage.
4. **Commission confirmation** — what event marks a registration confirmed, and who
   records it? That event is what makes money withdrawable.
