# Swapping credentials on a live site

Written for a specific situation: the site is launching on the developer's database,
bucket and service accounts, and the client's will replace them afterwards, while the
site is already live and already holding real enquiries.

That is a normal thing to do under a deadline. It is also the point at which a system is
most likely to lose data quietly, so the ordering below is not arbitrary.

## The one rule that matters

**Two of these variables hold state. The rest are just credentials.**

Swapping a credential is reversible and invisible to users. Swapping a *stateful*
connection is neither: everything written to the old one stays there, and the site
carries on working perfectly while pointing at an empty replacement. Nobody notices until
somebody asks where their application went.

| | Variable | What happens on a swap |
|---|---|---|
| 🔴 | `DATABASE_URL` / `DIRECT_DATABASE_URL` | **Every account, lead, application and commission stays in the old database.** The new one is empty and the site looks fine. |
| 🔴 | `S3_*` | **Every uploaded passport and transcript stays in the old bucket.** Existing documents 404 on download; new uploads work. |
| 🟡 | `SITE_ORIGIN` | Needs a **rebuild**. Baked into every canonical, `hreflang` and sitemap row at build time. |
| 🟡 | `NEXT_PUBLIC_MAPTILER_KEY` | Needs a **rebuild**. Inlined into the browser bundle. Runtime-only change does nothing. |
| 🟡 | `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` | Needs a **rebuild**, and must be swapped **together with** `CAPTCHA_SECRET` — they are a pair from one hCaptcha account, and a mismatched pair refuses every form submission. |
| 🟡 | `SESSION_SECRET` | Signs every user out immediately. Harmless at launch, disruptive later. |
| 🟢 | `MAIL_PROVIDER` / `MAIL_API_KEY` / `MAIL_FROM` | Clean. Stateless. Verify the new sending domain first. |
| 🟢 | `SENTRY_DSN` | Clean. Old errors stay in the old project. |
| 🟢 | `UPSTASH_*` | Clean. Rate-limit counters reset, which costs nothing. |
| 🟢 | `CRON_SECRET` | Clean. Vercel signs the cron request with whatever is set. |
| 🟢 | `TRANSLATE_*`, `PAYOUT_*`, `MAP_TILE_HOST`, `LOG_LEVEL`, `SEARCH_INDEXING` | Clean. |

## Verifying that a swap actually applied

This is the part people skip, and it is the part that catches the expensive mistake.

Every cold start in production logs one line naming what the process is pointed at:

```
{"level":"info","msg":"configuration","config":{
  "environment":"production",
  "siteOrigin":"https://campusturkey.org",
  "database":"ep-cold-band-pooler.eu-west-2.aws.neon.tech",
  "databaseDirect":"ep-cold-band.eu-west-2.aws.neon.tech",
  "storage":"s3 campus-turkey-documents @ s3.eu-west-2.amazonaws.com",
  "mail":"resend from campusturkey.org",
  "rateLimit":"apn1-....upstash.io",
  "errorTracking":"o12345.ingest.sentry.io",
  "searchIndexing":"on",
  "sessionSecret":"set","cronSecret":"set"
}}
```

Hosts and provider names only — never a connection string, a key or a token. See
`configurationFingerprint` in `server/lib/config.ts` for why each value is safe.

**After any swap, redeploy and read that line.** If it still names the old host, the
change did not apply: wrong environment scope in Vercel, or set for Preview and not
Production, or set but not redeployed. The site will be working perfectly either way,
which is exactly why reading the line matters more than clicking around the site.

## The safe order

### Do the green ones first, any time

Mail, Sentry, Upstash, cron. Change the variable, redeploy, read the configuration line.
If something is wrong, change it back — nothing has been written anywhere that matters.

Verify mail properly rather than by absence of errors: create a test partner from a
`PARTNER` lead and confirm the welcome email arrives. Every non-staff account is created
passwordless and depends on that email existing, so a silently broken mail provider means
nobody can sign in and nothing reports it.

### Then the amber ones, with a rebuild

`SITE_ORIGIN`, the two `NEXT_PUBLIC_` keys and `CAPTCHA_SECRET` are read at **build**
time, not at request time. Setting them in the platform and restarting is not enough:
they have to be present when `next build` runs, which on Vercel means setting them and
then triggering a new deployment rather than a restart.

Check after: load the site and confirm the map draws and an enquiry form submits. A
mismatched captcha pair produces a form that looks normal and refuses every submission
with a verification message the visitor cannot act on.

`SESSION_SECRET` last of these, because it signs everyone out. Do it when nobody is
mid-application.

### The red ones need a migration, not a swap

Do these **before** real users arrive if at all possible. Changing them afterwards is a
data migration, and the site should be in maintenance mode while it happens.

**Database.**

1. Turn on maintenance mode (`MAINTENANCE_MODE=on`), so nothing is written mid-copy. The
   edge serves 503 with `Retry-After` before the application is involved.
2. Take a dump of the old database and restore it into the client's:
   ```bash
   pg_dump "$OLD_DIRECT_DATABASE_URL" --no-owner --no-privileges -Fc -f transfer.dump
   pg_restore -d "$NEW_DIRECT_DATABASE_URL" --no-owner --no-privileges transfer.dump
   ```
3. Apply migrations against the new one: `npx prisma migrate deploy`.
4. Change both `DATABASE_URL` and `DIRECT_DATABASE_URL` — **as a pair.** Setting only the
   first gives a site that reads and writes the new database while every migration runs
   against the old one, which is the worst of the available outcomes and produces no
   error at all. The configuration line shows both hosts separately for this reason.
5. Redeploy, read the configuration line, turn maintenance off.
6. Confirm a known record exists: sign in as a partner and check the wallet balance and
   student list render.

Keep the old database for a week. It costs nothing and it is the only copy of anything
the dump missed.

**Document storage.**

Uploaded files are referenced by a storage key held in the database, so the rows survive
a bucket change and the files do not. Copy the objects across before switching:

```bash
aws s3 sync s3://OLD-BUCKET s3://NEW-BUCKET
```

Then swap all five `S3_*` variables together and redeploy. Confirm by downloading a
document uploaded *before* the swap, not a fresh one — a new upload proves the new bucket
works and proves nothing about the old files.

The new bucket must be **private**, with no public read policy. Every download is a
per-request presigned link that expires in five minutes, and a public bucket makes all of
that decorative.

## What cannot be rotated away

Two things are worth saying plainly, because they are not solved by any of the above.

**Data written to the developer's infrastructure was written there.** Between go-live and
the swap, real students' passports sit in the developer's bucket and real enquiries —
including medical ones carrying health data — sit in the developer's database. Copying
them across later does not un-write them. If the launch date cannot move, the honest
mitigations are to keep that window short, to delete the old copies once the migration is
verified, and to tell the client that this is how it was launched rather than discovering
it during a data protection review.

**A shared account is a shared account.** Every key created during development has been on
a developer's machine, in a `.env`, and possibly in a shell history. Rotate all of them at
handover even where the service is being kept, and treat that as routine hygiene rather
than as an accusation.

## After a full handover

Re-run the checks in `DEPLOYMENT.md`, "Verifying a deploy", and confirm the configuration
line names the client's hosts on every row. Then delete this document's assumptions from
your head: from that point the developer's accounts should have no access to anything the
site depends on, and the way to prove that is to close them.
