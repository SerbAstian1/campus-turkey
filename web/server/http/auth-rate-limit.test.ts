/**
 * The credential endpoints are rate limited, and the session endpoints are not.
 *
 * **Why this file exists.** The route's docblock used to state that `RATE_LIMITS.auth`
 * "sits in front via the matcher in middleware.ts". It did not: the middleware does no
 * rate limiting, and `enforceRateLimit` was reachable only from the `route()` wrapper —
 * which this endpoint bypasses by handing off to `toNextJsHandler` — and from the
 * payouts webhook. The policy was defined, unit-tested, and wired to nothing. A comment
 * is not a control, and nothing in the type system was ever going to say so.
 *
 * **Why the selectivity is tested as hard as the limit.** This is a catch-all. The
 * obvious fix — throttle everything arriving at `/api/auth/*` — would apply ten requests
 * per five minutes to `get-session`, which `useSession` polls on every mount, and to
 * `sign-out`. That locks a signed-in partner out of their own portal and strands them
 * signed in, which is a worse incident than the one being fixed. So the pass-through
 * cases below are not padding; they are the half of the change most likely to be
 * "simplified" by someone who reads the policy name and not the shape of the route.
 *
 * Upstash is replaced with a real in-memory sliding window rather than a stub that
 * returns a fixed answer. Counting is the behaviour under test — that the eleventh
 * request is refused and that two addresses do not share a counter — and a mock that
 * returns `success: false` on command proves neither.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* ---- A real sliding window, in memory ------------------------------------------- */

const buckets = vi.hoisted(() => new Map<string, number[]>());

vi.mock("@upstash/redis", () => ({
  Redis: class {
    constructor(_config: unknown) {}
  },
}));

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow = (limit: number, window: string) => ({ limit, window });

    private readonly max: number;
    private readonly windowMs: number;
    private readonly prefix: string;

    constructor(config: {
      limiter: { limit: number; window: string };
      prefix: string;
    }) {
      this.max = config.limiter.limit;
      this.windowMs = Number.parseInt(config.limiter.window, 10) * 1000;
      this.prefix = config.prefix;
    }

    async limit(identifier: string) {
      // Keyed by prefix *and* identifier, exactly as Upstash keys it. The prefix carries
      // the policy and scope, so a shared identifier across two policies stays separate.
      const key = `${this.prefix}:${identifier}`;
      const now = Date.now();
      const hits = (buckets.get(key) ?? []).filter((at) => now - at < this.windowMs);

      if (hits.length >= this.max) {
        buckets.set(key, hits);
        return { success: false, limit: this.max, remaining: 0, reset: hits[0]! + this.windowMs };
      }

      hits.push(now);
      buckets.set(key, hits);
      return { success: true, limit: this.max, remaining: this.max - hits.length, reset: now + this.windowMs };
    }
  },
}));

/** Redis must look configured or `ratelimit.ts` short-circuits before counting anything. */
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

/* ---- Better Auth, stubbed at the boundary ---------------------------------------- */

/**
 * The library is replaced with a spy, not exercised. Importing the real one pulls in the
 * Prisma adapter, the mail provider and the config guard; none of that participates in
 * the decision under test, and any of it failing would present as a rate-limit failure.
 */
const served = vi.hoisted(() => vi.fn());

vi.mock("@/server/lib/auth", () => ({ auth: { handler: vi.fn() } }));

vi.mock("better-auth/next-js", () => ({
  toNextJsHandler: () => ({
    GET: (request: Request) => served(request),
    POST: (request: Request) => served(request),
  }),
}));

const { GET, POST } = await import("../../app/api/auth/[...all]/route");

/* ---- Helpers --------------------------------------------------------------------- */

const from = (ip: string, path: string) =>
  new Request(`https://campusturkey.org/api/auth/${path}`, {
    method: "POST",
    headers: { "x-forwarded-for": ip },
  });

beforeEach(() => {
  buckets.clear();
  served.mockReset().mockImplementation(
    async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
  );
});
afterEach(() => vi.clearAllMocks());

/** The policy under test: `RATE_LIMITS.auth` is 10 per 300s per IP. */
const LIMIT = 10;

/* ---- Below the limit ------------------------------------------------------------- */

describe("requests below the limit", () => {
  it("reach Better Auth untouched", async () => {
    const response = await POST(from("203.0.113.9", "sign-in/email"));

    expect(response.status).toBe(200);
    expect(served).toHaveBeenCalledOnce();
  });

  it("allow the full allowance before refusing anything", async () => {
    for (let attempt = 1; attempt <= LIMIT; attempt++) {
      const response = await POST(from("203.0.113.10", "sign-in/email"));
      expect(response.status, `attempt ${attempt} should be allowed`).toBe(200);
    }
    expect(served).toHaveBeenCalledTimes(LIMIT);
  });
});

/* ---- Over the limit -------------------------------------------------------------- */

describe("requests over the limit", () => {
  it("receive 429 and never reach Better Auth", async () => {
    for (let attempt = 0; attempt < LIMIT; attempt++) {
      await POST(from("203.0.113.11", "sign-in/email"));
    }
    served.mockClear();

    const refused = await POST(from("203.0.113.11", "sign-in/email"));

    expect(refused.status).toBe(429);
    // The point of enforcing before delegation: no password is hashed, no row is read.
    expect(served).not.toHaveBeenCalled();
  });

  it("carry Retry-After and the project's error envelope", async () => {
    for (let attempt = 0; attempt < LIMIT; attempt++) {
      await POST(from("203.0.113.12", "sign-in/email"));
    }
    const refused = await POST(from("203.0.113.12", "sign-in/email"));

    const retryAfter = Number(refused.headers.get("Retry-After"));
    expect(Number.isFinite(retryAfter)).toBe(true);
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(300);

    // Byte-identical to a 429 from any `route()` endpoint, so a client that handles one
    // handles this.
    expect(refused.headers.get("x-request-id")).toBeTruthy();
    expect(refused.headers.get("cache-control")).toBe("no-store");

    const body = (await refused.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("rate_limited");
    expect(body.error.message).toMatch(/too many requests/i);
  });
});

/* ---- Identity isolation ---------------------------------------------------------- */

describe("client identities", () => {
  it("do not share a counter", async () => {
    for (let attempt = 0; attempt < LIMIT; attempt++) {
      await POST(from("198.51.100.1", "sign-in/email"));
    }
    expect((await POST(from("198.51.100.1", "sign-in/email"))).status).toBe(429);

    // A second address behind the same load balancer must be unaffected. If this fails,
    // one abusive client has denied sign-in to everyone.
    expect((await POST(from("198.51.100.2", "sign-in/email"))).status).toBe(200);
  });

  it("are read from the leftmost x-forwarded-for entry", async () => {
    // `clientIp` takes the leftmost hop, which on this platform the edge overwrites.
    // Two requests whose proxy chains differ but whose client is the same must count
    // against one bucket.
    for (let attempt = 0; attempt < LIMIT; attempt++) {
      await POST(
        new Request("https://campusturkey.org/api/auth/sign-in/email", {
          method: "POST",
          headers: { "x-forwarded-for": "198.51.100.7, 10.0.0.1" },
        }),
      );
    }

    const refused = await POST(
      new Request("https://campusturkey.org/api/auth/sign-in/email", {
        method: "POST",
        headers: { "x-forwarded-for": "198.51.100.7, 10.0.0.99" },
      }),
    );
    expect(refused.status).toBe(429);
  });
});

/* ---- Which paths are covered ----------------------------------------------------- */

describe("every credential path is limited", () => {
  // One address per path, so each is measured against its own fresh allowance.
  const paths = [
    "sign-in/email",
    "sign-up/email",
    "forget-password",
    "forget-password/email-otp",
    "reset-password",
    "change-password",
    "change-email",
    "email-otp/send-verification-otp",
    "email-otp/reset-password",
    "verify-email",
    "send-verification-email",
  ];

  it.each(paths)("refuses %s past the limit", async (path) => {
    const ip = `192.0.2.${paths.indexOf(path) + 1}`;

    for (let attempt = 0; attempt < LIMIT; attempt++) {
      expect((await POST(from(ip, path))).status).toBe(200);
    }
    expect((await POST(from(ip, path))).status).toBe(429);
  });

  it("covers a sub-path of a listed prefix", async () => {
    // Matching is by prefix so a provider added later inherits the protection on the day
    // it appears, rather than the day somebody remembers this file.
    const ip = "192.0.2.200";
    for (let attempt = 0; attempt < LIMIT; attempt++) {
      await POST(from(ip, "sign-in/some-provider-added-later"));
    }
    expect((await POST(from(ip, "sign-in/some-provider-added-later"))).status).toBe(429);
  });
});

describe("session traffic is deliberately not limited", () => {
  it("lets get-session through far past the credential allowance", async () => {
    // `useSession` polls this on every mount. Throttling it locks a signed-in partner
    // out of their own portal for reading their own session.
    for (let attempt = 0; attempt < LIMIT * 3; attempt++) {
      const response = await GET(
        new Request("https://campusturkey.org/api/auth/get-session", {
          headers: { "x-forwarded-for": "203.0.113.50" },
        }),
      );
      expect(response.status).toBe(200);
    }
  });

  it("lets sign-out through", async () => {
    for (let attempt = 0; attempt < LIMIT * 2; attempt++) {
      const response = await POST(from("203.0.113.51", "sign-out"));
      expect(response.status).toBe(200);
    }
  });

  it("keeps signing out available to an address already refused for signing in", async () => {
    const ip = "203.0.113.52";
    for (let attempt = 0; attempt < LIMIT; attempt++) {
      await POST(from(ip, "sign-in/email"));
    }
    expect((await POST(from(ip, "sign-in/email"))).status).toBe(429);

    // Being throttled at the door must not trap someone already inside.
    expect((await POST(from(ip, "sign-out"))).status).toBe(200);
  });
});
