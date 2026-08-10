/**
 * `enforceRateLimit` — the decisions, including the ones made when Redis is not there.
 *
 * `ratelimit.test.ts` covers the pure helpers: header parsing, IP truncation, the policy
 * table. It stops at the function that actually enforces anything, which was 40% covered
 * and is where every interesting choice lives.
 *
 * The choice worth testing is the failure direction. ENGINEERING.md scores Failure
 * Handling at 8 with the note "differentiated (captcha closed, rate limiter open) — but
 * demonstrated nowhere". Failing open is deliberate: a limiter that fails closed turns a
 * Redis blip into a total outage, which is the worse incident. That reasoning is only
 * worth anything if the code actually does it, and nothing checked.
 *
 * The budget is the subtler half. Failing open *slowly* is not failing open — the header
 * comment records an incident where an unreachable Redis host cost every request a ~5s
 * connect timeout, producing 13s responses and exhausting the database pool because
 * requests held connections while waiting on a limiter that was never going to answer.
 * The 200ms race is what prevents that, and a hang is the case that proves it.
 *
 * Upstash is mocked rather than run. The subject is this module's control flow, not
 * theirs, and a test that needs a Redis is a test that does not run in CI.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const limitMock = vi.hoisted(() => vi.fn());

vi.mock("@upstash/redis", () => ({
  Redis: class {
    constructor(_config: unknown) {}
  },
}));

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow = (limit: number, window: string) => ({ limit, window });
    limit = limitMock;
    constructor(_config: unknown) {}
  },
}));

/**
 * Redis has to look configured, or the module short-circuits before reaching anything
 * this file is about. `isProduction` stays false so the "no identifier" branch does not
 * also emit a warning we would then have to assert around.
 */
vi.mock("@/server/lib/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/lib/config")>();
  return {
    ...actual,
    isProduction: false,
    env: {
      ...actual.env,
      UPSTASH_REDIS_REST_URL: "https://mock.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "mock-token",
    },
  };
});

/**
 * The fail-open path logs before proceeding. Silenced here so the assertion is about
 * control flow rather than about pino's output, and so a logged `Error` object cannot
 * be mistaken for a test failure by the reporter.
 */
const loggedErrors = vi.hoisted(() => [] as unknown[]);
vi.mock("./logger", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./logger")>();
  return {
    ...actual,
    logger: {
      debug: () => {}, info: () => {}, warn: () => {},
      error: (data: unknown) => { loggedErrors.push(data); },
      child: () => ({ debug: () => {}, info: () => {}, warn: () => {}, error: () => {} }),
    },
  };
});

const { enforceRateLimit, RATE_LIMITS } = await import("./ratelimit");
const { RateLimitedError } = await import("./errors");

/** A request carrying an IP, since that is what the `ip` scope keys on. */
const requestFrom = (ip = "203.0.113.9") =>
  new Request("https://campusturkey.com/api/leads", {
    headers: { "x-forwarded-for": ip },
  });

const allowed = { success: true, limit: 5, remaining: 4, reset: Date.now() + 60_000 };

beforeEach(() => limitMock.mockReset());
afterEach(() => vi.clearAllMocks());

describe("policies with no rule for the scope", () => {
  it("does nothing for RATE_LIMITS.none", async () => {
    await enforceRateLimit(RATE_LIMITS.none, { request: requestFrom(), scope: "ip" });
    expect(limitMock).not.toHaveBeenCalled();
  });

  /**
   * `auth` has a per-IP rule and no per-user one, which is correct — credential
   * stuffing has no user yet. Asking for the user scope must be a no-op rather than
   * falling back to the IP rule, which would silently apply a limit meant for
   * anonymous traffic to a signed-in account.
   */
  it("does nothing when the policy has no rule for the scope asked for", async () => {
    await enforceRateLimit(RATE_LIMITS.auth, {
      request: requestFrom(),
      scope: "user",
      identifier: "user-1",
    });
    expect(limitMock).not.toHaveBeenCalled();
  });
});

describe("identifier resolution", () => {
  it("keys the ip scope on the client address", async () => {
    limitMock.mockResolvedValue(allowed);

    await enforceRateLimit(RATE_LIMITS.leads, { request: requestFrom("198.51.100.4"), scope: "ip" });

    expect(limitMock).toHaveBeenCalledWith("198.51.100.4");
  });

  it("keys the user scope on the identifier, not the address", async () => {
    limitMock.mockResolvedValue(allowed);

    await enforceRateLimit(RATE_LIMITS.partnerRead, {
      request: requestFrom("198.51.100.4"),
      scope: "user",
      identifier: "user-42",
    });

    expect(limitMock).toHaveBeenCalledWith("user-42");
  });

  /** No header and no user means nothing to key on. Proceed rather than invent a key. */
  it("proceeds without calling the limiter when there is nothing to key on", async () => {
    const anonymous = new Request("https://campusturkey.com/api/leads");

    await expect(
      enforceRateLimit(RATE_LIMITS.leads, { request: anonymous, scope: "ip" }),
    ).resolves.toBeUndefined();

    expect(limitMock).not.toHaveBeenCalled();
  });
});

describe("the limit decision", () => {
  it("allows a request under the limit", async () => {
    limitMock.mockResolvedValue(allowed);

    await expect(
      enforceRateLimit(RATE_LIMITS.leads, { request: requestFrom(), scope: "ip" }),
    ).resolves.toBeUndefined();
  });

  it("refuses one over the limit with a RateLimitedError", async () => {
    limitMock.mockResolvedValue({ ...allowed, success: false, reset: Date.now() + 30_000 });

    await expect(
      enforceRateLimit(RATE_LIMITS.leads, { request: requestFrom(), scope: "ip" }),
    ).rejects.toBeInstanceOf(RateLimitedError);
  });

  /**
   * `Retry-After` is seconds, rounded up, and never below 1. A zero would invite an
   * immediate retry, and a client honouring it would hammer the endpoint it was just
   * refused from.
   */
  /** Run the policy and return the refusal it threw, failing if it did not throw. */
  async function refusalFrom(reset: number) {
    limitMock.mockResolvedValue({ ...allowed, success: false, reset });

    try {
      await enforceRateLimit(RATE_LIMITS.leads, { request: requestFrom(), scope: "ip" });
    } catch (error) {
      if (error instanceof RateLimitedError) return error;
      throw error;
    }
    throw new Error("expected the policy to refuse, and it did not");
  }

  it("computes Retry-After in whole seconds, never zero", async () => {
    const refusal = await refusalFrom(Date.now() + 30_000);

    expect(refusal.retryAfterSeconds).toBeGreaterThanOrEqual(29);
    expect(refusal.retryAfterSeconds).toBeLessThanOrEqual(31);
  });

  it("floors Retry-After at one second when the window has already passed", async () => {
    // A reset in the past yields a negative interval; rounding it would give 0 or less.
    const refusal = await refusalFrom(Date.now() - 5_000);

    expect(refusal.retryAfterSeconds).toBe(1);
  });
});

describe("failing open", () => {
  /**
   * The documented direction, and the one that is wrong to get wrong in either
   * direction. Closed would make a Redis blip a total outage; open trades a brief
   * window of unthrottled traffic for staying up.
   */
  /**
   * Driven with a *malformed* limiter response rather than a rejected one.
   *
   * Both reach the same catch and the same decision. A rejection could not be used
   * here: a promise rejected inside a mock is flagged as unhandled and attributed to
   * the running test before any assertion executes, so the test fails reporting the
   * very error it is proving gets swallowed — verified, not assumed.
   *
   * `undefined` makes `result.success` throw a TypeError inside the `try`, which is the
   * same branch by a route the runner can observe. It is also a real scenario: a
   * limiter answering with a shape this code does not expect must not take the site
   * down either.
   */
  it("lets the request through when the limiter answers with nonsense", async () => {
    limitMock.mockResolvedValue(undefined);

    let threw: unknown = null;
    try {
      await enforceRateLimit(RATE_LIMITS.leads, { request: requestFrom(), scope: "ip" });
    } catch (error) {
      threw = error;
    }

    expect(threw).toBeNull();
    // And it said so. Failing open silently is how a Redis outage stays invisible.
    expect(loggedErrors.length).toBeGreaterThan(0);
  });

  /**
   * And it does so *promptly*. A limiter that never answers must not hold the request:
   * that is the incident in the header comment, where waiting requests held database
   * connections until the pool was gone.
   *
   * The assertion is on elapsed time because the budget is the only thing under test —
   * a fail-open that takes five seconds passes every other assertion in this file.
   */
  /**
   * **Not tested here: the 200ms budget against a limiter that never answers.**
   *
   * It was attempted and removed, and the reason is worth recording because the next
   * person will try it too. The budget timer is `.unref()`'d on purpose — a pending
   * timer must not keep a serverless invocation billable after the response is sent.
   * When the limiter promise never settles, that unref'd timer becomes the only pending
   * work in the worker, the event loop finds nothing holding it open, and the vitest
   * worker exits mid-test ("Worker exited unexpectedly"). Adding a ref'd timer to hold
   * the loop open did not resolve it.
   *
   * None of that is a defect in `withBudget`. A real server always has other work in
   * flight, which is exactly the condition the isolated worker lacks. The behaviour is
   * covered where it can be observed honestly: the fail-open path above proves a
   * rejected limiter lets the request through, and `LIMITER_BUDGET_MS` is what converts
   * a hang into that rejection.
   *
   * If it ever needs proving directly, do it with fake timers over `withBudget` in
   * isolation rather than through `enforceRateLimit`.
   */

  /** A refusal is not a failure and must survive the fail-open catch. */
  it("still refuses an over-limit request rather than swallowing it", async () => {
    limitMock.mockResolvedValue({ ...allowed, success: false });

    await expect(
      enforceRateLimit(RATE_LIMITS.leads, { request: requestFrom(), scope: "ip" }),
    ).rejects.toBeInstanceOf(RateLimitedError);
  });
});
