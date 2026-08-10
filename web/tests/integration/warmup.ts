/**
 * Wake the database before the first test's clock starts.
 *
 * Neon suspends an idle compute. Waking it takes seconds, and without this that cost is
 * paid inside whichever test happens to run first — which is the concurrency test, the
 * one case in this suite whose failure reads as "the money path has a race". A cold
 * start that presents as a red concurrency test is the most expensive possible way for
 * this suite to be flaky, because the correct response to that test failing is to stop
 * and audit the withdrawal path.
 *
 * `globalSetup` rather than a `beforeAll`: it runs once for the whole run, outside any
 * test's timeout, so the wait is attributed to setup where it belongs instead of
 * inflating one test's measured duration.
 *
 * The URL is built here rather than read from the environment, because `test.env` in
 * the vitest config does not apply to global setup — this runs in vitest's own process.
 * Relying on it was the first version of this file, and it failed on every run with the
 * 10-second default while the tests it protects passed.
 */

import { PrismaClient } from "@prisma/client";
import { integrationDatabaseUrl } from "./database-url";

export async function setup(): Promise<void> {
  const db = new PrismaClient({
    datasources: { db: { url: integrationDatabaseUrl() } },
  });
  const started = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    const elapsed = Date.now() - started;
    // Worth printing: a run that spent 20 seconds here was a cold compute, and that is
    // the explanation for an otherwise mysteriously slow first test.
    if (elapsed > 2_000) {
      console.log(`[integration] database woke in ${(elapsed / 1000).toFixed(1)}s`);
    }
  } finally {
    await db.$disconnect();
  }
}
