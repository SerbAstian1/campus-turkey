/**
 * `pool_timeout` has to outlive `connect_timeout`, or a cold database looks like a broken one.
 *
 * The two settle a race. `connect_timeout` is how long Prisma waits for a new connection
 * to the database; `pool_timeout` is how long a query waits for the pool to hand it one.
 * Prisma defaults the second to 10s no matter what the first says, so a URL that raises
 * `connect_timeout` to 30 for a serverless database that suspends when idle leaves every
 * query giving up at 10 while the connection it is queued behind is still being made.
 *
 * What that produced: the first request after an idle period returned 500 with "Timed out
 * fetching a new connection from the connection pool", the second succeeded, the third was
 * fast. The directory rendered "We could not load the directory" on a cold load and worked
 * on refresh — which reads as a flaky network rather than a setting, and is why it went
 * unexplained for a while.
 *
 * Measured before the fix, against this project's own Neon endpoint:
 *   run 1 — universities 500 in 12.0s, facets 500 in 10.6s
 *   run 2 — universities 200 in  6.3s, facets 200 in  3.9s
 *   run 3 — universities 200 in  2.7s, facets 200 in  1.5s
 */

import { describe, expect, it } from "vitest";
import { datasourceUrl } from "../../server/lib/db";

const NEON = "postgresql://u:p@ep-x.eu-west-2.aws.neon.tech/neondb?sslmode=require&connection_limit=10&connect_timeout=30";

const param = (url: string, name: string) => new URL(url).searchParams.get(name);

describe("the datasource url", () => {
  it("gives a query longer to queue than the connection it waits on", () => {
    const connect = Number(param(NEON, "connect_timeout"));
    const pool = Number(param(datasourceUrl(NEON), "pool_timeout"));
    expect(pool).toBeGreaterThan(connect);
  });

  it("leaves connection_limit alone", () => {
    // The limit multiplies across every warm serverless instance, so it is not this
    // function's to touch — only how long a query waits for a connection that exists.
    expect(param(datasourceUrl(NEON), "connection_limit")).toBe("10");
  });

  it("respects an explicit pool_timeout, however low", () => {
    const explicit = `${NEON}&pool_timeout=2`;
    expect(datasourceUrl(explicit)).toBe(explicit);
  });

  it("leaves a url alone when connect_timeout is under Prisma's own default", () => {
    // Nothing to reconcile: the 10s default already outlasts the connection attempt.
    const quick = "postgresql://u:p@localhost:5432/db?connect_timeout=5";
    expect(datasourceUrl(quick)).toBe(quick);
  });

  it("leaves a url with no connect_timeout alone", () => {
    const plain = "postgresql://u:p@localhost:5432/db";
    expect(datasourceUrl(plain)).toBe(plain);
  });

  it("hands back anything it cannot parse rather than guessing", () => {
    expect(datasourceUrl("not a url")).toBe("not a url");
  });
});
