# Runbook

The failure modes most likely to happen, and the first thing to do about each.

Every log line carries a `requestId`. A user quoting one from an error screen is
handing you the exact query: `requestId:"<value>"` in the log search returns everything
that happened while their request was handled.

## Monitoring and thresholds

| Signal | Threshold | Route to |
|---|---|---|
| Uptime (`GET /api/health`) | 2 consecutive failures, 30s interval | email + SMS |
| 5xx rate | > 1% of requests over 5 minutes | email |
| 5xx rate | > 5% over 2 minutes | email + SMS |
| p95 latency, API routes | > 500ms over 10 minutes | email |
| p99 latency, API routes | > 1500ms over 10 minutes | email |
| Postgres connections | > 80% of the instance limit | email |
| `audit:withdrawal.refused` with `reason=insufficient` | > 20 in 10 minutes | email — probing, or a balance bug |
| Any log line with `"audit":true` and `event:"withdrawal.transitioned"` | none — dashboard only | reviewed weekly |
| Serialisation retry warnings | > 10 in 5 minutes | email — contention where there should be none |

**On-call is one email address and one phone number.** For a studio delivering to a
client this is the honest arrangement, and stating it is better than implying a rota
that does not exist. Agree in writing who holds it after handover.

## Error budget

99.5% monthly availability — about 3h 40m of downtime a month. Planned maintenance
inside an announced window does not count against it. Two consecutive months of breach
is the trigger to revisit hosting rather than to work harder.

---

## 1. A partner says a withdrawal was taken twice

**Almost certainly it was not.** Confirm before doing anything else.

```sql
SELECT id, reference, "amountMinor", status, "idempotencyKey", "requestedAt"
FROM withdrawal
WHERE "partnerId" = '<uuid>'
ORDER BY "requestedAt" DESC
LIMIT 20;
```

- **Two rows, same `idempotencyKey`** — impossible; the unique constraint forbids it.
  If you see it, the constraint is missing. Check `\d withdrawal` and re-run migration
  `0002`. This is a Blocker.
- **Two rows, different keys, same amount and minutes apart** — the partner submitted
  twice from two form sessions. The idempotency key is per form session by design, so
  this is working as specified. Reject one via the staff console (never with an
  `UPDATE`), which records a `withdrawal_event` explaining why.
- **One row** — the partner is looking at the pending *and* the paid line, or at the
  commission and the withdrawal. Walk them through the statement.

Never resolve this with a manual `UPDATE`. The append-only trigger will refuse to let
you edit the audit trail, and the audit trail is what settles the dispute.

## 2. Balance looks wrong

```sql
SELECT
  (SELECT COALESCE(SUM("amountMinor"),0) FROM commission
    WHERE "partnerId"=$1 AND state='CONFIRMED') AS confirmed,
  (SELECT COALESCE(SUM("amountMinor"),0) FROM commission
    WHERE "partnerId"=$1 AND state='PENDING')   AS pending,
  (SELECT COALESCE(SUM("amountMinor"),0) FROM withdrawal
    WHERE "partnerId"=$1 AND status<>'REJECTED') AS committed;
```

`available = confirmed − committed`. If that is negative, the log will already contain
`partner balance is overdrawn` at error level, and the withdrawal endpoint is refusing
new requests with `balance_under_review` — which is correct and deliberate.

The only way to reach it is a commission reversed after being withdrawn against. Find it:

```sql
SELECT id, "amountMinor", state, "updatedAt" FROM commission
WHERE "partnerId"=$1 AND state='REVERSED' ORDER BY "updatedAt" DESC;
```

This is an accounting decision, not an engineering one. Escalate to whoever owns
commissions; do not adjust rows to make the number look right.

## 3. 503s from every route

Check `MAINTENANCE_MODE` first — it is the cheapest possible explanation and it is
sometimes the answer.

```bash
curl -sS -D- -o /dev/null https://campusturkey.org/api/health
```

- **`/api/health` returns 200 but pages 503** → maintenance mode is on. Set it off.
- **`/api/health` returns 503** → the database did not answer within 2s. Check the
  provider status page and the connection count. If connections are exhausted, confirm
  `DATABASE_URL` is the **pooled** URL with `connection_limit=1`; a direct URL on a
  serverless runtime exhausts Postgres within minutes of real traffic and this is the
  single most likely cause.
- **No response at all** → platform incident. Check Vercel status.

## 4. Sign-in is failing for everyone

- **Just after a deploy** → `SESSION_SECRET` changed. Rotating it signs everyone out by
  design. Confirm the value matches what was there before; if it was rotated
  deliberately, this is expected and resolves as people sign in again.
- **429 from `/api/auth/*`** → the rate limiter is doing its job (10 per 5 minutes per
  IP). If a whole office is behind one NAT this will fire legitimately; raise
  `RATE_LIMITS.auth.perIp` rather than removing it.
- **Redis unreachable** → the limiter fails *open* and logs
  `rate limiter unavailable, failing open`. Sign-in still works. Fix Redis, but this is
  not the cause of an auth outage.

## 5. Lead forms return 403

The captcha is failing closed, which is intended for an unauthenticated write endpoint.

```
log: "captcha verification failed"
```

Check the provider's status and that `CAPTCHA_SECRET` matches the site key the frontend
uses. **Do not set `CAPTCHA_PROVIDER=disabled` in production to clear it** — production
refuses to boot with it disabled, and the reason is handoff note 13: these forms collect
passport-adjacent and, on the medical desk, health data.

## 6. Translation stopped working

Expected degradation: `/api/translate` returns 503 and the site stays in English. The
client handles this — it is not an outage.

- **429** → someone is hammering the proxy. It fronts a metered key, so the limit is
  protecting the budget.
- **502** → the provider failed twice. Check their status page.
- **503 with no provider outage** → `TRANSLATE_PROVIDER` or `TRANSLATE_API_KEY` is
  unset. That is a configuration problem, not an incident.

The permanent fix is handoff note 1: ship reviewed static locale files and delete the
runtime sweep entirely.



## 7. The balance query got slower and nothing changed

The balance aggregate is an index-only scan **only while the visibility map is current**,
and vacuum is what keeps it current. Measured both ways: with the map populated the
query is `Index Only Scan using commission_balance_confirmed`; without it, the identical
query degrades to a bitmap heap scan.

Nothing alerts on this. If the hottest financial query gets slower for no apparent
reason, check that autovacuum has not been turned off or starved on these two tables:

```sql
SELECT relname, last_autovacuum, n_dead_tup
FROM pg_stat_user_tables
WHERE relname IN ('commission','withdrawal');
```

---

## Scheduled work

| Job | Cadence | What it does |
|---|---|---|
| Lead retention purge | daily, 03:00 UTC | `purgeExpiredLeads` — hard-deletes expired **inquiries** first, then leads left with none. Two passes on purpose: a 90-day medical enquiry must not inherit a 730-day study enquiry's window because the same person sent both. Converted leads are kept — they are an account holder's origin record. |
| Backup restore drill | quarterly | see DEPLOYMENT.md; record the measured RTO |
| Dependency review | monthly | `npm audit --omit=dev`; never `--force` (handoff note 14) |
| Certificate renewal | automatic | Vercel; verify annually that it still is |
