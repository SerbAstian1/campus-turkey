# Deployment and rollback

## Environments

| Environment | Host | Database | Notes |
|---|---|---|---|
| local | `npm run dev` | local Postgres or a Neon branch | `CAPTCHA_PROVIDER=disabled`, no Redis |
| preview | Vercel preview, per PR | Neon branch, reset per PR | `MAINTENANCE_MODE` never on |
| production | Vercel | Neon or Supabase, pooled | all `[prod]` variables required or boot fails |

Every variable is documented in [`.env.example`](../.env.example) with whether it is
required, and `server/lib/config.ts` refuses to boot without the required ones. A
variable discovered by a 500 at 3am is a documentation failure, not an ops failure.

## First-time setup

1. **Database.** Create the instance in the **client's own account**, not yours. Copy
   the pooled URL to `DATABASE_URL` and the direct URL to `DIRECT_DATABASE_URL`.
2. **Least-privilege role.** The app should not connect as the database owner:
   ```sql
   CREATE ROLE campus_turkey_app LOGIN PASSWORD '…';
   GRANT CONNECT ON DATABASE campus_turkey TO campus_turkey_app;
   GRANT USAGE ON SCHEMA public TO campus_turkey_app;
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO campus_turkey_app;
   GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO campus_turkey_app;
   ```
   Migration `0002` then revokes `UPDATE, DELETE` on `withdrawal_event` from this role
   automatically. Run migrations as the owner, not as this role.
3. **Secrets.** `openssl rand -base64 32` for `SESSION_SECRET`. Set every variable in
   the Vercel project **before** the first deploy — a missing one is a boot failure by
   design.
4. **Migrations.** `npx prisma migrate deploy` against `DIRECT_DATABASE_URL`.
5. **HSTS.** `middleware.ts` sets `preload`. Only submit the domain to the preload list
   once you are certain the site will be https-only forever — it is difficult to undo.
6. **Design system assets.** See the next section. This one is easy to miss and the
   failure is silent, so it is not a bullet point.

## Design system assets

`web/public/ds/` and `web/public/assets/` are **generated, not committed**. The design
system's one home is `_ds/` at the repository root, and `npm run setup` copies it in.

This matters more than a build step usually does, because of how the assets are
consumed. `src/styles/tokens.css` imports `/ds/tokens/*.css` at *runtime*, and
`src/ds/load.ts` fetches `/ds/_ds_bundle.js` from the browser — that bundle is the
component library. `next build` does not need any of it to succeed. So a deploy that
skips the copy step builds green, deploys green, and serves **unstyled markup with no
components and no icons**, with nothing anywhere reporting an error.

`prebuild` now refuses to build in that state and names the fix. What remains is a
choice about the deploy, and it has to be made deliberately:

| Option | Vercel Root Directory | Build command | Trade |
|---|---|---|---|
| **A — build from the repo root** *(recommended)* | repository root | `npm run setup && npm run build --prefix web` | Keeps one home for the design system. Needs the root directory set to the repo, not `web/`. |
| **B — vendor the copies** | `web/` | unchanged | `web/` becomes genuinely self-contained. Costs ~2.3MB committed and a second copy that can drift from `_ds/` — remove `web/public/ds/` and `web/public/assets/` from `.gitignore` and commit them. |

A is recommended: the drift in B is the exact problem the gitignore entry was added to
prevent, and it drifts silently. If B is chosen anyway, add a CI step that re-runs
`npm run setup` and fails on a non-empty `git diff`, so the copies cannot go stale
unnoticed.

Whichever is chosen, verify it the same way — deploy, then `view-source:` the homepage
and confirm `/ds/_ds_bundle.js` returns 200 rather than 404. A 404 there is the blank
site, and it looks identical to a styling bug from the outside.

## The build needs a real database

`next build` prerenders **1,263 pages**, and the university catalogue moved into Postgres
in P04 — so `generateStaticParams` and every university page read from the database at
build time. `DATABASE_URL` must point at a reachable instance during the build. A
placeholder URL does not degrade gracefully; the build fails.

Two things about that connection were found by running it, and both are configuration
rather than code:

**Give the build URL longer timeouts.** Neon suspends an idle compute and waking this one
measures ~8 seconds, against Prisma's `pool_timeout` default of 10. The first query of a
cold build lands inside that margin and the build dies at page 0. Append to the build's
`DATABASE_URL`:

```
?pool_timeout=60&connect_timeout=60
```

**Do not raise `connection_limit` instead.** That was tried: at the default the build
failed at 315 of 1,263 pages with the pool exhausted, and at `connection_limit=25` it
reached 631 before Neon's pooler refused connections outright with P1001. Tuning the pool
moves the ceiling; it does not remove it. The ceiling was an N+1 — two to three queries
per page against a forty-row table — and it is fixed in
`app/[locale]/(site)/universities/[slug]/page.tsx`, which loads the catalogue once per
build worker. That fix is why the default pool is now sufficient and the timeouts are the
only setting that matters.

The same reasoning applies to `npm run test:integration`, which sets these timeouts
itself in `vitest.integration.config.ts`.

## Deploying

Merging to `main` deploys. CI blocks the merge on install → prisma generate →
typecheck → test with coverage → `next build`. Nothing deploys that has not passed all
five.

Migrations run **before** the deploy, as a separate step:

```bash
npx prisma migrate deploy      # against DIRECT_DATABASE_URL
# then let the platform deploy
```

**Every migration must be backward-compatible with the currently running code**, because
for the window between the two steps the old code is talking to the new schema. That
means additive-only in a single deploy: add a nullable column, backfill, switch reads,
stop writing the old one, drop it — five deploys, not one. A migration that drops or
renames a column in the same deploy as the code change will break during rollout.

### Verifying a deploy

Not "the dashboard is green":

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://campusturkey.com/api/health   # 200
curl -sS -o /dev/null -w '%{http_code}\n' https://campusturkey.com/            # 200
curl -sS -o /dev/null -w '%{http_code}\n' https://campusturkey.com/no-such-page # 404, not 200
curl -sS https://campusturkey.com/sitemap.xml | head -5                        # real XML
```

The 404 check matters more than it looks: a soft 404 is the specific regression the
routing migration existed to fix, and it is invisible from a browser.

## Rollback

**Target: under 5 minutes to the previous known-good state.**

### Rolling back a deploy (the easy one)

1. Vercel → Deployments → the last known-good → **Promote to Production**. ~30 seconds.
2. Re-run the four verification checks above.
3. Only then work out what went wrong.

### Rolling back a migration (the hard one)

There is no `prisma migrate down`, and there is deliberately no automated path here.

1. **If the migration was additive** — a new nullable column, a new index, a new table —
   *do not roll it back*. Roll back the deploy. Additive schema is compatible with the
   older code, which is the entire reason for the expand/contract discipline above.
2. **If the migration was destructive**, restore from the backup taken immediately
   before it (see below). This costs the RTO, not five minutes.
3. **A destructive migration must be known to be destructive before it ships.** Review
   the generated SQL for `DROP`, `ALTER … TYPE` and `NOT NULL` on an existing column.
   If any appear, take a manual snapshot first and record its id in the PR.

### Backups

| | |
|---|---|
| **What** | The whole Postgres instance |
| **How** | Provider point-in-time recovery — Neon 7-day history, or Supabase daily + PITR |
| **RPO** | ≤ 5 minutes (PITR write-ahead log retention) |
| **RTO** | ≤ 60 minutes (branch restore, re-point `DATABASE_URL`, redeploy) |
| **Restore tested** | **No — not yet.** See the drill below. |

An untested backup is a hypothesis. Before handover, run this once and record the date:

1. Restore the production database to a new branch at a timestamp one hour ago.
2. Point a preview deployment at it.
3. Sign in as a seeded partner; confirm the wallet balance and withdrawal list render.
4. Record the wall-clock time from step 1 to step 3. That number is the real RTO.

## Maintenance mode

```
MAINTENANCE_MODE=on
MAINTENANCE_RETRY_AFTER_SECONDS=1800
```

Takes effect on the next deploy or environment-variable propagation. Serves 503 with
`Retry-After` from the edge, before the application bundle — which is the point, since
the app bundle is often exactly what is broken. `/api/health` stays reachable so the
platform can distinguish "deliberately down" from "fell over", and so the deploy that
ends maintenance can be verified.
