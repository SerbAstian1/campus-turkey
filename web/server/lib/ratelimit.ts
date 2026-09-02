/**
 * Rate limiting.
 *
 * Backed by Upstash Redis rather than an in-process counter, because this deploys to a
 * serverless runtime where each invocation may be a fresh instance. A per-instance
 * counter enforces `limit / instanceCount`, which under the load it exists to stop is
 * effectively no limit at all.
 *
 * `clientIp` is exported and pure so the header-parsing rules can be tested. Trusting
 * the wrong header is how a rate limiter is bypassed by setting one.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { createHmac } from "node:crypto";
import { Redis } from "@upstash/redis";
import { env, isProduction } from "./config";
import { RateLimitedError } from "./errors";
import { logger } from "./logger";

export interface RateLimitPolicy {
  /** Stable key prefix. Changing it resets everyone's counter — treat as a migration. */
  name: string;
  /** Requests permitted per window, keyed by IP. */
  perIp: { limit: number; windowSeconds: number } | null;
  /** Requests permitted per window, keyed by authenticated user. */
  perUser: { limit: number; windowSeconds: number } | null;
}

/**
 * The policies, in one table so the whole posture is readable at a glance.
 *
 * Reads are generous, writes moderate, credential and money endpoints strict. The
 * numbers are chosen against the shape of real use, not picked round: a partner adding
 * students works in bursts, so `partnerWrite` allows 30/minute; nobody legitimately
 * requests more than a handful of withdrawals in an hour.
 */
export const RATE_LIMITS = {
  /** Explicit opt-out, for endpoints where a limit would be actively wrong. */
  none: { name: "none", perIp: null, perUser: null },

  /** Sign-in and password reset. This is what credential stuffing targets. */
  auth: {
    name: "auth",
    perIp: { limit: 10, windowSeconds: 300 },
    perUser: null,
  },

  /** Public lead forms. Backed by a captcha as well — see handoff note 13. */
  leads: {
    name: "leads",
    perIp: { limit: 5, windowSeconds: 600 },
    perUser: null,
  },

  /**
   * The translation proxy. Generous because a single page view legitimately produces
   * a burst, and capped because it fronts a metered third-party key — an unlimited
   * proxy in front of a paid API is someone else's budget with our name on it.
   */
  translate: {
    name: "translate",
    perIp: { limit: 120, windowSeconds: 60 },
    perUser: null,
  },

  /**
   * Public catalogue reads: the university directory and its filter options.
   *
   * Generous, because browsing the directory legitimately produces a burst — a visitor
   * changing three filters fires three requests in a second, and paging through results
   * fires more. Capped anyway, because these endpoints are unauthenticated and hit the
   * database on every miss; the edge cache absorbs the repeat traffic, and this limits
   * what reaches the origin when somebody iterates the query string.
   */
  publicRead: {
    name: "public-read",
    perIp: { limit: 240, windowSeconds: 60 },
    perUser: null,
  },

  /** Authenticated reads: portal dashboards, lists. */
  partnerRead: {
    name: "partner-read",
    perIp: { limit: 300, windowSeconds: 60 },
    perUser: { limit: 120, windowSeconds: 60 },
  },

  /** Authenticated writes: adding students, managing payout methods. */
  partnerWrite: {
    name: "partner-write",
    perIp: { limit: 60, windowSeconds: 60 },
    perUser: { limit: 30, windowSeconds: 60 },
  },

  /**
   * Withdrawal requests. Strict on purpose. The idempotency key already makes a retry
   * safe, so a partner hitting this limit is not someone whose payout failed — it is
   * someone probing, and 10 an hour is well above any real pattern.
   */
  withdrawals: {
    name: "withdrawals",
    perIp: { limit: 20, windowSeconds: 3600 },
    perUser: { limit: 10, windowSeconds: 3600 },
  },

  /** Provider webhooks. High, because a provider may legitimately burst on retry. */
  webhook: {
    name: "webhook",
    perIp: { limit: 600, windowSeconds: 60 },
    perUser: null,
  },

  /**
   * Verification codes, keyed by the address they would be sent to.
   *
   * `auth` above caps requests per IP, and that is the wrong axis for this one thing:
   * the recipient is chosen by whoever is asking, so somebody rotating IPs can keep
   * every individual address under the IP limit while one mailbox receives all of it.
   * The cost lands on a real person's inbox and on a metered sending reputation, and
   * neither is visible from an IP counter.
   *
   * Five an hour sits well above a real person retrying — a code lasts ten minutes and
   * carries three attempts — and well below a volume that gets a sending domain
   * suppressed.
   *
   * `perIp` is null on purpose: this policy exists to add the axis the IP limit cannot
   * see, not to duplicate it. Both apply on the OTP path.
   */
  otpRecipient: {
    name: "otp-recipient",
    perIp: null,
    perUser: { limit: 5, windowSeconds: 3600 },
  },
} as const satisfies Record<string, RateLimitPolicy>;

/**
 * The client IP.
 *
 * Only the leftmost entry of `x-forwarded-for` is meaningful, and only because Vercel
 * overwrites the header at the edge — it cannot be spoofed by the client on this
 * platform. On a platform where it can, this function is wrong and the proxy must be
 * configured to strip and re-set it. That caveat is the reason this is a named function
 * with a comment rather than an inline `headers.get()`.
 */
export function clientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || null;
}

/**
 * Truncate an IP before it is stored on a lead.
 *
 * /24 for IPv4 and /48 for IPv6: enough to correlate abuse from one network, not
 * enough to be a location record for one person. Storing the full address on a form
 * submission is a data-protection liability with no operational payoff.
 */
export function ipPrefix(ip: string | null): string | null {
  if (!ip) return null;
  if (ip.includes(":")) {
    const groups = ip.split(":").slice(0, 3);
    return groups.length === 3 ? `${groups.join(":")}::/48` : null;
  }
  const octets = ip.split(".");
  if (octets.length !== 4) return null;
  return `${octets[0]}.${octets[1]}.${octets[2]}.0/24`;
}

/**
 * A stable, non-reversible limiter key for an email address.
 *
 * Limiting by recipient needs one counter per address, and the obvious key — the address
 * itself — would leave Redis holding a list of everyone who has requested a sign-in code.
 * That is a personal-data store nobody designed, nobody documented and nobody empties.
 * An HMAC under the session secret partitions identically while the key on its own says
 * nothing: equal addresses collide, unequal ones do not, and a dump of Redis is not a
 * mailing list.
 *
 * Lower-cased and trimmed first, because `A@example.com ` and `a@example.com` reach the
 * same mailbox and must not be handed a separate allowance each.
 *
 * Truncated to 32 hex characters. That is 128 bits — collisions are not a practical
 * concern, and a shorter key keeps the Redis keyspace readable during an incident.
 */
export function recipientKey(email: string): string {
  return createHmac("sha256", env.SESSION_SECRET)
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 32);
}

const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN })
    : null;

const limiters = new Map<string, Ratelimit>();

function limiterFor(key: string, limit: number, windowSeconds: number): Ratelimit | null {
  if (!redis) return null;
  const cached = limiters.get(key);
  if (cached) return cached;

  const created = new Ratelimit({
    redis,
    // Sliding window rather than fixed: a fixed window lets a caller send `limit`
    // requests at 59s and `limit` again at 61s, i.e. double the intended rate across
    // the boundary.
    limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
    prefix: `ct:rl:${key}`,
    analytics: false,
  });
  limiters.set(key, created);
  return created;
}

/**
 * How long the limiter gets to answer before the request proceeds without it.
 *
 * Failing open is the right call (see `enforceRateLimit`), but failing open *slowly* is
 * not failing open — it is an outage with extra steps. Observed with an unreachable
 * Redis host: every request paid the full ~5s DNS/connect timeout before proceeding,
 * producing 13s responses and exhausting the database connection pool, because requests
 * held their connections while waiting on a limiter that was never going to answer. A
 * Redis blip became a site-wide latency incident.
 *
 * 200ms is generously above a healthy Upstash round trip from the same region (single
 * digit ms) and far below anything a user would notice. Exceeding it means Redis is
 * unhealthy, and the decision to proceed unthrottled has already been made — this only
 * governs how fast that decision is reached.
 */
const LIMITER_BUDGET_MS = 200;

/** Reject if `work` has not settled within the budget. The rejection is caught by the
 *  fail-open handler, so a timeout and an outage take the same path. */
function withBudget<T>(work: Promise<T>): Promise<T> {
  return Promise.race([
    work,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`rate limiter exceeded its ${LIMITER_BUDGET_MS}ms budget`)),
        LIMITER_BUDGET_MS,
      // `unref` so a pending timer cannot hold the process open — it would keep a
      // serverless invocation billable after the response was already sent.
      ).unref(),
    ),
  ]);
}

/**
 * A union rather than one shape with two optional fields, because the two scopes need
 * genuinely different things and the flat version could not say so.
 *
 * Under `scope: "user"` the identifier was optional and the request was required — the
 * exact opposite of what that branch uses. A caller that forgot the identifier compiled
 * cleanly and then silently applied no limit at all, because `enforceRateLimit` returns
 * early when it cannot resolve one. Splitting the type makes that omission a type error.
 */
export type EnforceOptions =
  | { scope: "ip"; request: Request }
  | { scope: "user"; identifier: string; request?: Request };

/**
 * Apply a policy, or throw `RateLimitedError`.
 *
 * Failure behaviour is the interesting decision. When Redis is unreachable this fails
 * *open* — the request proceeds — and logs an error. A rate limiter that fails closed
 * turns a Redis blip into a total outage, which is a worse incident than a brief window
 * of unthrottled traffic. In production the absence of Redis entirely is a boot failure
 * (see config.ts), so this path only covers a transient outage, not a missing config.
 */
export async function enforceRateLimit(
  policy: RateLimitPolicy,
  options: EnforceOptions,
): Promise<void> {
  const rule = options.scope === "ip" ? policy.perIp : policy.perUser;
  if (!rule) return;

  const identifier =
    options.scope === "user" ? options.identifier : clientIp(options.request.headers);

  if (!identifier) {
    // No IP and no user means nothing to key on. Common in local development.
    if (isProduction) {
      logger.warn({ policy: policy.name }, "rate limit could not resolve an identifier");
    }
    return;
  }

  const limiter = limiterFor(
    `${policy.name}:${options.scope}`,
    rule.limit,
    rule.windowSeconds,
  );
  if (!limiter) return;

  try {
    const result = await withBudget(limiter.limit(identifier));
    if (!result.success) {
      const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
      throw new RateLimitedError(retryAfter);
    }
  } catch (error) {
    if (error instanceof RateLimitedError) throw error;
    logger.error({ err: error, policy: policy.name }, "rate limiter unavailable, failing open");
  }
}
