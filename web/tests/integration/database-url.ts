/**
 * The connection string the integration suite connects with.
 *
 * One module because three things need the same URL and they do not share an
 * environment: the vitest config (which sets `test.env` for the test workers), the
 * global setup (which runs in vitest's own process, where `test.env` does **not**
 * apply), and anything else that builds a client outside a test.
 *
 * That difference is not academic — it is the bug this file exists to prevent. The
 * timeouts were first applied in the config alone, the warmup kept Prisma's 10-second
 * default, and it failed on every run while the tests it was meant to protect passed.
 */

/**
 * Wait longer than Prisma's defaults for the first connection of a run.
 *
 * Measured: waking this suspended Neon compute takes ~8 seconds, against a `pool_timeout`
 * that defaults to 10. That margin is why the failure was intermittent rather than
 * constant, and why it landed on whichever test ran first — the concurrency test. A
 * cold start presenting as a red concurrency test is the worst way for this suite to
 * fail, because the correct response to that test going red is to stop and audit the
 * withdrawal path for a race that is not there.
 *
 * Raised rather than retried: the connection genuinely takes that long, and a retry
 * would hide real pool exhaustion behind the same wait.
 */
export function withConnectionTimeouts(url: string): string {
  const parsed = new URL(url);
  // Only fill what the operator has not already chosen.
  if (!parsed.searchParams.has("pool_timeout")) parsed.searchParams.set("pool_timeout", "60");
  if (!parsed.searchParams.has("connect_timeout")) parsed.searchParams.set("connect_timeout", "60");
  return parsed.toString();
}

/**
 * Read it from the environment, with the timeouts applied.
 *
 * Throws rather than defaulting. A default here would be a localhost URL, and a suite
 * that silently tests an empty local database instead of the one asked for reports
 * success for work it never did.
 */
export function integrationDatabaseUrl(): string {
  const configured = process.env["DATABASE_URL"];
  if (!configured) {
    throw new Error(
      "Integration tests need a real DATABASE_URL. Put one in .env or pass it in the environment.",
    );
  }
  return withConnectionTimeouts(configured);
}
