# Architecture

The boundaries, and why they sit where they do.

## The one rule

**`src/` is the frontend's. Everything else is the server's.**

`app/src/` holds components, screens, content, motion, design tokens and styles. This
layer does not restructure it, does not rename its files, and does not renegotiate its
decisions. The two sides meet at typed contracts in `app/src/content/types.ts`, imported
here through the `@contracts/*` alias — declared once, never restated.

That alias is the only line that changes when `app/src` moves into `web/src`. See
[MIGRATION.md](./MIGRATION.md).

## Tree

```
web/
├── app/                      Next.js App Router — routing and HTTP only
│   ├── api/                  route handlers; no business logic lives here
│   ├── layout.tsx            document shell, base metadata, organisation JSON-LD
│   ├── not-found.tsx         a real HTTP 404, which hash routing could not produce
│   ├── sitemap.ts            generated from the content modules, so it cannot drift
│   └── robots.ts
├── server/                   the backend. Never imported by a browser bundle.
│   ├── lib/                  cross-cutting: config, db, logger, errors, auth,
│   │                         ratelimit, money, seo
│   ├── http/                 the route wrapper and session resolution
│   ├── modules/              one folder per bounded concept
│   │   ├── wallet/           balance arithmetic + admission rule (pure), wallet service
│   │   ├── withdrawals/      state machine (pure), schema, repository, service
│   │   ├── payout-methods/   vaulting flow, repository, static rail options
│   │   ├── students/         pipeline
│   │   └── leads/            public forms, retention, captcha
│   └── types/api.ts          the EDSAI boundary — DTO mappers, nothing else
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│       └── 0002_integrity_constraints/   CHECKs, partial indexes, append-only trigger
├── tests/                    setup, and (not yet written) integration suites
└── middleware.ts             CSP, security headers, maintenance 503 from the edge
```

## Layers, and the import direction

```
route handler  →  service  →  repository  →  Prisma
      ↓             ↓
   schema (Zod)   pure domain (balance.ts, withdrawal.state.ts)
```

Allowed:

- A route handler may import a service, a schema and a DTO mapper.
- A service may import repositories, pure domain modules and `lib/`.
- A repository may import `lib/db` and generated Prisma types. Nothing else.
- Pure domain modules import `lib/money` and nothing at all beyond it.

Forbidden, and each is a review-stopping defect rather than a style note:

- **Prisma called outside a repository or a service transaction.** The `Db` parameter
  every repository takes is what makes composition into a transaction possible; a route
  handler reaching for `db` directly cannot participate in one.
- **HTTP concepts inside a service.** Services throw `AppError` subclasses; only
  `lib/errors.ts` knows a status code. This is why the money path is testable without a
  server.
- **A partner id taken from a request body or path.** Every partner-scoped query uses
  `session.partner.id`. There is deliberately no repository function that accepts an
  unscoped id, so the whole class of cross-tenant read is unreachable rather than
  guarded.

## Where the important decisions live

| Decision | File | Why there |
|---|---|---|
| May this withdrawal be created? | `modules/wallet/balance.ts` | Pure, so it can be tested exhaustively. 100% covered. |
| Which status may follow which? | `modules/withdrawals/withdrawal.state.ts` | Same. One table, 25 pairs, all tested. |
| Is the balance safe under concurrency? | `lib/db.ts` → `serializable()` | SERIALIZABLE + bounded retry. See the isolation note in that file. |
| Who may call this endpoint? | the `access` field on every `route()` | Required by the type. An endpoint without a rule does not compile. |
| What may be logged? | `lib/logger.ts` → `redact()` | Pure and tested, because "we redact secrets" deserves more than a comment. |
| What reaches the client on an error? | `lib/errors.ts` → `toErrorResponse()` | One place. Anything unmodelled becomes an opaque 500. |

## The change-amplification test

*"Add a second approver above a threshold amount"* — the most likely next feature, and
client open question 1.

| File | Change |
|---|---|
| `withdrawal.state.ts` | Add `PENDING_SECOND_APPROVAL`; two rows in the transition table |
| `withdrawals.service.ts` | Branch on the threshold when transitioning out of `REQUESTED` |
| `schema.prisma` | Add `partner.secondApprovalAboveMinor` |
| `withdrawal.state.test.ts` | Extend the matrix |

**Four files, three of them the ones a reader would guess.** No route handler changes,
no repository changes, and the frontend is untouched because `WithdrawalStatus` gains a
member the portal does not render until someone asks it to.

## What is deliberately not here

- **A separate API service.** One deployable until a workload shape demands otherwise.
  Splitting now would buy independent scaling nobody needs and cost a network hop on
  every request.
- **An event bus.** Five entities, one write path that matters. A queue would be
  ceremony.
- **Redis for caching.** Redis is here for rate limiting only, because serverless makes
  in-process counters useless. Caching starts at HTTP headers and the CDN; nothing has
  been measured that justifies more.
