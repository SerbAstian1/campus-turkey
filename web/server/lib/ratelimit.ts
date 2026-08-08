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

export interface EnforceOptions {
  request: Request;
  scope: "ip" | "user";
  identifier?: string;
}

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
    const result = await limiter.limit(identifier);
    if (!result.success) {
      const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
      throw new RateLimitedError(retryAfter);
    }
  } catch (error) {
    if (error instanceof RateLimitedError) throw error;
    logger.error({ err: error, policy: policy.name }, "rate limiter unavailable, failing open");
  }
}
