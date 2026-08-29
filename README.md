# Campus Turkey

The Campus Turkey website: a public site in seventeen languages, a filterable university
directory on a real map, a partner portal, and a staff console.

One deployable application. Everything runs from `web/`.

```bash
cd web
npm install
cp .env.example .env      # then fill in DATABASE_URL, DIRECT_DATABASE_URL, SESSION_SECRET
npx prisma migrate deploy
node scripts/seed-universities.mjs
npm run dev
```

Node 20 or newer, and a Postgres — a local one or a free Neon branch. The application
refuses to boot without the variables it needs rather than failing on the first request
that wanted one, and the error names every variable that is missing.

## What is in here

```
web/                 The application. Next.js, TypeScript, PostgreSQL, Prisma, Better Auth.
  app/               Routes: 26 pages and 46 API endpoints, all under /[locale]
  src/               Screens, content, design system façade, i18n   (EDSAI owns this)
  server/            Services, repositories, auth, logging          (DEVPOINT owns this)
  prisma/            Schema and migrations
  docs/              Architecture, deployment, runbook, testing, engineering report
  scripts/           Setup, seeding, staff creation, i18n tooling
_ds/                 The Campus Turkey design system. The one home for tokens and components.
assets/              Brand artwork and photography
site/, screens/      The original prototype and its reference screenshots
Campus Turkey Website.html    The prototype. Opens in a browser, no build.
Developer handoff notes.md    The client's 14 notes. Read before changing behaviour.
```

Start at [`web/README.md`](web/README.md). The engineering report and the Production
Audit are in [`web/docs/ENGINEERING.md`](web/docs/ENGINEERING.md).

## The design system is copied in, not committed

`web/public/ds/` and `web/public/assets/` are generated. `_ds/` is the source of truth and
the copy step runs automatically before every build, so a normal `npm run build` produces
a complete site. To refresh them by hand after changing `_ds/`:

```bash
npm run setup            # from the repository root
npm run ds:sync          # or from web/
```

This matters more than a build step usually does. `next build` does not need `public/` to
succeed, so a deploy that skips the copy builds green, deploys green, and serves unstyled
markup with no components and no icons, reporting nothing anywhere. That shipped once. It
is now automatic and guarded, and `web/docs/DEPLOYMENT.md` explains what to check.

## Architecture, in one paragraph

Content is separated from presentation: `web/src/content/` holds every service, article,
institution and scholarship, and the screens read from it, so swapping in a CMS means
changing that folder rather than rewriting components. The university catalogue has
already moved a step further and lives in Postgres. Routes are real URLs with their own
titles, descriptions, canonicals and `hreflang` sets, and an unknown address returns a
genuine 404. Every visitor-facing page is server-rendered as readable text and the design
system hydrates over it, so the site is legible to a crawler that runs no JavaScript.

Every visual decision comes from `_ds/`. Colours, type, spacing and components are tokens,
not literals.

## Testing

808 tests. `npm test` in `web/`, or `npm run test:coverage` for the gate CI enforces.
The money path — balances, the withdrawal state machine, money arithmetic — is held at
100%. Coverage across the whole service layer is lower and is reported honestly in
[`web/docs/TESTING.md`](web/docs/TESTING.md).

A separate integration suite runs against a real Postgres and proves the four things a
single connection cannot: two simultaneous requests for one balance producing exactly one
withdrawal, idempotent replay, the state machine refusing a partner actor beneath the
route guard, and the append-only audit trigger.

## Before this serves real users

Four things are the client's to supply and cannot be done in code: a lawyer's approval of
the privacy notice, the partner terms and commission schedule that two forms already ask
people to agree to, a payout provider, and the service accounts in the client's own name.

Two are one-line commands that are easy to miss and look like a broken site when skipped:
seeding the university catalogue into the live database, and creating the first staff
account — nobody can approve a partner or a representative until one exists. Both are in
[`web/docs/DEPLOYMENT.md`](web/docs/DEPLOYMENT.md).

Photography is not included. Every image frame carries a `data-slot` name and a label
describing what belongs there. University logos need written permission from each
university.
