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

  /**
   * Document storage — brief §18, §83.
   *
   * `local` writes to `.uploads/` and exists so the upload and review flows can be built
   * before a bucket exists. It is refused in production by the cross-check below: object
   * storage on a serverless platform's local disk is a file that vanishes on the next
   * cold start, and finding that out after a student has uploaded a passport is not a
   * recoverable mistake.
   *
   * `s3` speaks to Amazon S3, Cloudflare R2 and Supabase Storage alike. R2 and Supabase
   * need `S3_FORCE_PATH_STYLE=true`.
   */
  STORAGE_PROVIDER: z.enum(["s3", "local", "unconfigured"]).default("unconfigured"),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  /** Full origin, including scheme. R2: `https://<account>.r2.cloudflarestorage.com`. */
  S3_ENDPOINT: url.optional(),
  S3_FORCE_PATH_STYLE: z.enum(["true", "false"]).default("false"),

  /** Error tracking. Absent in development; required in production by the check below. */
  SENTRY_DSN: url.optional(),

  /**
   * MapTiler, for the directory's tile layer — handoff note 13, which asks that
   * production traffic leave OpenStreetMap's public server.
   *
   * **Public by design, and the `NEXT_PUBLIC_` prefix is not a mistake.** Leaflet
   * requests tiles from the browser, so the key travels in a URL every visitor can
   * read. The control is the domain restriction set in MapTiler's dashboard, not
   * secrecy — an unrestricted key is someone else's tile budget regardless of where it
   * is stored.
   *
   * Validated here so a production deploy without it refuses to boot rather than
   * quietly serving OSM tiles. One caveat that check cannot cover: Next inlines
   * `NEXT_PUBLIC_*` at **build** time, so the variable must be present in the build
   * environment as well as the runtime one. Present at runtime but absent at build
   * gives a server that boots happily and a browser bundle with `undefined` in it.
   */
  NEXT_PUBLIC_MAPTILER_KEY: z.string().optional(),

  /**
   * An additional tile host for the CSP `img-src` allowlist.
   *
   * Additive only — `tileImageSources` always includes MapTiler, so an empty or
   * forgotten value can no longer blank the map, which is how the previous
   * CARTO-versus-OpenStreetMap mismatch stayed invisible. Set it only for a
   * self-hosted or proxied tile set.
   */
  MAP_TILE_HOST: url.optional(),

  /**
   * Bearer token for `/api/cron/purge-leads`.
   *
   * Read directly from `process.env` by that route. Declared here so the variable is
   * at least *known* to the schema rather than invisible to it.
   *
   * Deliberately **not** enforced in production, because that would be a behaviour
   * change unrelated to the map work this was added alongside. It arguably should be:
   * without it the purge returns 503 and never runs, so personal data is retained past
   * the window the consent notice promised — a silent compliance failure rather than an
   * outage, which is the kind nothing reports. Worth its own change.
   */
  CRON_SECRET: z.string().optional(),

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

  if (env.STORAGE_PROVIDER === "s3") {
    const missing = (
      ["S3_BUCKET", "S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_ENDPOINT"] as const
    ).filter((name) => !env[name]);

    // Refused at boot rather than at the first upload. A document subsystem that accepts
    // a passport it cannot store is worse than one that will not start.
    if (missing.length > 0) {
      problems.push(`STORAGE_PROVIDER is s3 but ${missing.join(", ")} missing`);
    }
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
    if (env.STORAGE_PROVIDER === "local") {
      // Serverless local disk does not survive a cold start. A passport stored there is
      // a passport lost, discovered only when somebody goes looking for it.
      problems.push(
        "STORAGE_PROVIDER cannot be 'local' in production — uploaded documents would be lost on the next cold start",
      );
    }
    if (env.STORAGE_PROVIDER === "unconfigured") {
      problems.push(
        "STORAGE_PROVIDER must be configured in production — document upload is part of every application",
      );
    }
    if (env.MAIL_PROVIDER === "disabled") {
      // `auth.ts` requires email verification only when a provider exists, so that
      // development is not locked out by a verification nobody can send. Production must
      // not inherit that relaxation: without mail there is no verification, no password
      // reset, and no way to tell a partner their account is ready.
      problems.push(
        "MAIL_PROVIDER must be configured in production — email verification and password reset both depend on it",
      );
    }
    if (!env.SITE_ORIGIN.startsWith("https://")) {
      problems.push("SITE_ORIGIN must be https in production — cookies are Secure-only");
    }
    if (!env.NEXT_PUBLIC_MAPTILER_KEY) {
      // Without it the map falls back to OpenStreetMap's public tile server, which
      // handoff note 13 is explicit must not carry production traffic. The failure is
      // invisible from the outside — the map looks right — so it has to be caught here.
      problems.push(
        "NEXT_PUBLIC_MAPTILER_KEY is required in production — the map would fall back to OpenStreetMap's public tiles, which its usage policy forbids. It must be set at build time too; Next inlines it.",
      );
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
