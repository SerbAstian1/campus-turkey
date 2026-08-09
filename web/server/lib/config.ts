/**
 * Environment configuration, validated once at module load.
 *
 * The failure mode this prevents: a missing variable discovered by a 500 at 3am
 * instead of by a refusal to boot. Every variable this system reads is declared here
 * with its shape, and the process does not start without the required ones.
 *
 * Nothing in this file has a default that would be dangerous if it were silently
 * wrong. `SESSION_SECRET` has no fallback; a development default for a signing secret
 * is how a development default reaches production.
 */

import { z } from "zod";

const url = z.string().url();

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  /** Pooled connection, used by the request path. See Department 20 on pooling. */
  DATABASE_URL: z.string().min(1),
  /** Direct connection, used by Prisma Migrate only. Never by the request path. */
  DIRECT_DATABASE_URL: z.string().min(1),

  /**
   * Public origin. Canonical URLs, the sitemap, Open Graph tags, cookie domain and
   * the CORS allowlist are all derived from this — so a wrong value is visible
   * immediately rather than subtly.
   */
  SITE_ORIGIN: url,

  /**
   * Better Auth's signing secret. At least 32 bytes of real entropy:
   * `openssl rand -base64 32`. Rotating it signs every existing session out, which is
   * the intended behaviour during an incident.
   */
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),

  /** Translation provider. The key never reaches the browser — that is the point. */
  TRANSLATE_PROVIDER: z.enum(["deepl", "google", "azure", "disabled"]).default("disabled"),
  TRANSLATE_API_KEY: z.string().optional(),
  TRANSLATE_ENDPOINT: url.optional(),

  /**
   * Upstash Redis, for rate limiting. In-process counters do not work on a serverless
   * runtime: each invocation may be a fresh instance, so a per-instance counter
   * enforces the limit divided by the instance count, which is no limit at all.
   * Optional so that local development runs without it — `ratelimit.ts` fails closed
   * on public write endpoints when it is absent in production.
   */
  UPSTASH_REDIS_REST_URL: url.optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  /** Payout provider. Absent until the client answers open question 3. */
  PAYOUT_PROVIDER: z.enum(["wise", "airwallex", "flutterwave", "unconfigured"]).default("unconfigured"),
  PAYOUT_API_BASE: url.optional(),
  PAYOUT_API_KEY: z.string().optional(),
  PAYOUT_WEBHOOK_SECRET: z.string().optional(),

  /** Transactional mail. */
  MAIL_PROVIDER: z.enum(["resend", "postmark", "disabled"]).default("disabled"),
  MAIL_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().email().optional(),

  /** Error tracking. Absent in development; required in production by the check below. */
  SENTRY_DSN: url.optional(),

  /** Turnstile or hCaptcha, guarding the public lead forms. */
  CAPTCHA_PROVIDER: z.enum(["turnstile", "hcaptcha", "disabled"]).default("disabled"),
  CAPTCHA_SECRET: z.string().optional(),

  /**
   * Set to "on" to serve the maintenance response from the edge. Read by
   * `middleware.ts`, which returns 503 with `Retry-After` before the app bundle is
   * involved — the maintenance screen has to render when the app itself is down.
   */
  MAINTENANCE_MODE: z.enum(["on", "off"]).default("off"),
  MAINTENANCE_RETRY_AFTER_SECONDS: z.coerce.number().int().positive().default(600),

  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
});

export type Env = z.infer<typeof schema>;

/**
 * Rules that span more than one variable. A provider selected without its credential
 * is a misconfiguration that would otherwise surface as a runtime failure on the first
 * request that needed it.
 */
function crossCheck(env: Env): string[] {
  const problems: string[] = [];

  if (env.TRANSLATE_PROVIDER !== "disabled" && !env.TRANSLATE_API_KEY) {
    problems.push("TRANSLATE_PROVIDER is set but TRANSLATE_API_KEY is missing");
  }
  if (env.PAYOUT_PROVIDER !== "unconfigured" && !env.PAYOUT_API_KEY) {
    problems.push("PAYOUT_PROVIDER is set but PAYOUT_API_KEY is missing");
  }
  if (env.PAYOUT_PROVIDER !== "unconfigured" && !env.PAYOUT_API_BASE) {
    problems.push("PAYOUT_PROVIDER is set but PAYOUT_API_BASE is missing");
  }
  if (env.PAYOUT_PROVIDER !== "unconfigured" && !env.PAYOUT_WEBHOOK_SECRET) {
    // An unverified webhook endpoint is an unauthenticated write endpoint that can
    // mark withdrawals as paid. This is a refusal to boot, not a warning.
    problems.push("PAYOUT_PROVIDER is set but PAYOUT_WEBHOOK_SECRET is missing");
  }
  if (env.MAIL_PROVIDER !== "disabled" && (!env.MAIL_API_KEY || !env.MAIL_FROM)) {
    problems.push("MAIL_PROVIDER is set but MAIL_API_KEY or MAIL_FROM is missing");
  }
  if (env.CAPTCHA_PROVIDER !== "disabled" && !env.CAPTCHA_SECRET) {
    problems.push("CAPTCHA_PROVIDER is set but CAPTCHA_SECRET is missing");
  }

  if (env.NODE_ENV === "production") {
    if (!env.SENTRY_DSN) {
      problems.push("SENTRY_DSN is required in production — errors would go unrecorded");
    }
    if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
      problems.push(
        "Upstash Redis is required in production — per-instance rate limiting does not work on a serverless runtime",
      );
    }
    if (env.CAPTCHA_PROVIDER === "disabled") {
      problems.push("CAPTCHA_PROVIDER must be configured in production — see handoff note 13");
    }
    if (!env.SITE_ORIGIN.startsWith("https://")) {
      problems.push("SITE_ORIGIN must be https in production — cookies are Secure-only");
    }
  }

  return problems;
}

/**
 * An optional variable left blank is unset, not invalid.
 *
 * `.env.example` ships every optional key with an empty value, so that the file
 * documents what exists. Copying it and filling in only what you need is the intended
 * workflow — but `SENTRY_DSN=` arrives as `""`, and `z.string().url().optional()`
 * rejects an empty string rather than skipping it. The result was a refusal to boot
 * over four variables that had been deliberately left out, which turned the honest
 * "don't start misconfigured" guarantee into a false alarm on a correct config.
 *
 * Dropping blanks makes "present but empty" and "absent" the same thing, which is what
 * everyone editing a `.env` already assumes. Required variables are unaffected: a blank
 * one is still absent and still fails, now reporting "Required" rather than "Invalid
 * url", which is the more accurate complaint.
 */
export function withoutBlanks(
  source: Record<string, string | undefined>,
): Record<string, string> {
  const kept: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined && value.trim() !== "") kept[key] = value;
  }
  return kept;
}

function load(): Env {
  const parsed = schema.safeParse(withoutBlanks(process.env));

  if (!parsed.success) {
    // Names only. Printing the values would put secrets in the boot log, which is
    // usually the most widely readable log there is.
    const missing = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n  ${missing.join("\n  ")}`);
  }

  const problems = crossCheck(parsed.data);
  if (problems.length > 0) {
    throw new Error(`Invalid environment configuration:\n  ${problems.join("\n  ")}`);
  }

  return parsed.data;
}

export const env: Env = load();

export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
