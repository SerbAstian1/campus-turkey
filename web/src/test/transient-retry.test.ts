/**
 * Retrying a database read that failed because the database was briefly unreachable.
 *
 * **Why this is tested rather than observed.** The build it fixes failed at page 332 of
 * 1,331 on a single `P1001`, and the build after the fix passed without firing a single
 * retry — because Neon happened to be healthy that run. A green build is therefore no
 * evidence at all that the retry works; only forcing the failure is. The bug was
 * intermittent, so the proof has to be deterministic.
 *
 * Two behaviours matter and they are separate. Retrying handles the blip. Not caching the
 * rejected promise is what stops one blip becoming permanent: `catalogue ??= fetch()`
 * stores whatever the first call produced, and a promise that rejected is still a value,
 * so every later page in that worker would have failed for a database that had already
 * recovered.
 */

import { describe, expect, it, vi } from "vitest";
import { isTransientConnectionError, withTransientRetry } from "../../server/lib/db";

/** Prisma reports the reason in `code`; the message is prose and varies. */
const prismaError = (code: string) => Object.assign(new Error(`prisma failed: ${code}`), { code });

describe("recognising a transient connection failure", () => {
  it("accepts the four codes that mean the database was unreachable", () => {
    // P1001 refused, P1008 timed out, P1017 closed by the server, P2024 waited out the pool.
    for (const code of ["P1001", "P1008", "P1017", "P2024"]) {
      expect(isTransientConnectionError(prismaError(code))).toBe(true);
    }
  });

  it("rejects errors that say the query was wrong", () => {
    // A unique-constraint violation repeats identically however many times it is retried.
    for (const code of ["P2002", "P2025", "P2003"]) {
      expect(isTransientConnectionError(prismaError(code))).toBe(false);
    }
    expect(isTransientConnectionError(new Error("plain"))).toBe(false);
    expect(isTransientConnectionError(null)).toBe(false);
  });
});

describe("withTransientRetry", () => {
  it("returns the value without retrying when the first call works", async () => {
    const run = vi.fn().mockResolvedValue("catalogue");
    await expect(withTransientRetry(run)).resolves.toBe("catalogue");
    expect(run).toHaveBeenCalledOnce();
  });

  it("retries a transient failure and returns the eventual success", async () => {
    vi.useFakeTimers();
    const run = vi.fn()
      .mockRejectedValueOnce(prismaError("P1001"))
      .mockRejectedValueOnce(prismaError("P1001"))
      .mockResolvedValue("catalogue");

    const pending = withTransientRetry(run, { attempts: 5 });
    await vi.runAllTimersAsync();

    await expect(pending).resolves.toBe("catalogue");
    expect(run).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  it("does not retry an error that is not about the connection", async () => {
    const run = vi.fn().mockRejectedValue(prismaError("P2002"));
    await expect(withTransientRetry(run)).rejects.toMatchObject({ code: "P2002" });
    // Retrying a constraint violation would only fail again, more slowly.
    expect(run).toHaveBeenCalledOnce();
  });

  it("gives up after the attempt limit and rethrows the last failure", async () => {
    vi.useFakeTimers();
    const run = vi.fn().mockRejectedValue(prismaError("P1001"));

    const pending = withTransientRetry(run, { attempts: 3 });
    const assertion = expect(pending).rejects.toMatchObject({ code: "P1001" });
    await vi.runAllTimersAsync();
    await assertion;

    expect(run).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });
});

describe("the memoisation the build depends on", () => {
  /**
   * The shape `publishedCatalogue` uses, reproduced so the caching rule can be asserted
   * without a database. The `catch` that clears the slot is the whole point: without it
   * the rejected promise is what every later caller receives.
   */
  function makeCatalogue(fetch: () => Promise<string>) {
    let cached: Promise<string> | null = null;
    return () => {
      cached ??= fetch().catch((error: unknown) => {
        cached = null;
        throw error;
      });
      return cached;
    };
  }

  it("fetches once while it succeeds", async () => {
    const fetch = vi.fn().mockResolvedValue("rows");
    const catalogue = makeCatalogue(fetch);
    await Promise.all([catalogue(), catalogue(), catalogue()]);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("does not serve a rejection to every later caller", async () => {
    const fetch = vi.fn()
      .mockRejectedValueOnce(prismaError("P1001"))
      .mockResolvedValue("rows");
    const catalogue = makeCatalogue(fetch);

    await expect(catalogue()).rejects.toMatchObject({ code: "P1001" });
    // The database has recovered; the next page must not inherit the first page's failure.
    await expect(catalogue()).resolves.toBe("rows");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
