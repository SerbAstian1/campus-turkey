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
   * **Now required in production**, by the cross-check below. It was previously left
   * unenforced because adding the rule was unrelated to the work it arrived alongside,
   * with a note that it arguably should be. This is that change.
   *
   * The argument for enforcing it: without the variable the purge route answers 503 and
   * the daily job never runs, so leads are retained past the window the consent notice
   * promises — 90 days for a medical enquiry, two years otherwise. That is a compliance
   * failure rather than an outage, and it is the kind nothing reports. No error is
   * logged, no page breaks, and the first anyone knows is a subject access request
   * turning up data that should have been deleted a year earlier.
   *
   * A refusal to boot is the right severity for a promise the site makes in writing to
   * every person who ticks the consent box.
   */
  CRON_SECRET: z.string().optional(),

  /** Turnstile or hCaptcha, guarding the public lead forms. */
  CAPTCHA_PROVIDER: z.enum(["turnstile", "hcaptcha", "disabled"]).default("disabled"),
  CAPTCHA_SECRET: z.string().optional(),

  /**
   * The hCaptcha **site** key — the public half, rendered into the widget.
   *
   * Distinct from `CAPTCHA_SECRET`, which is the private half and never leaves the
   * server. Both are needed and neither substitutes for the other: without the secret
   * the server cannot verify, and without the site key the browser produces no token to
   * verify, which is the state this application shipped in until now.
   *
   * `NEXT_PUBLIC_` is correct and is inlined at **build** time, so it must be present in
   * the build environment as well as at runtime.
   */
  NEXT_PUBLIC_HCAPTCHA_SITE_KEY: z.string().optional(),

  /**
   * Set to "on" to serve the maintenance response from the edge. Read by
   * `middleware.ts`, which returns 503 with `Retry-After` before the app bundle is
   * involved — the maintenance screen has to render when the app itself is down.
   */
  MAINTENANCE_MODE: z.enum(["on", "off"]).default("off"),
  MAINTENANCE_RETRY_AFTER_SECONDS: z.coerce.number().int().positive().default(600),

  /**
   * `off` withholds the whole deployment from search engines, for the staging site
   * clients are shown before launch.
   *
   * Read directly from `process.env` by `middleware.ts`, which runs on the edge and
   * cannot import this module. Declared here so the variable is known to the schema and
   * a typo is a refusal to boot rather than a site that quietly stays indexed.
   *
   * Defaults to `on`, and that direction is deliberate. This site exists to be found;
   * a forgotten variable must not be able to deindex it.
   */
  SEARCH_INDEXING: z.enum(["on", "off"]).default("on"),

  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
});

export type Env = z.infer<typeof schema>;

/**
 * Rules that span more than one variable. A provider selected without its credential
 * is a misconfiguration that would otherwise surface as a runtime failure on the first
 * request that needed it.
 */
export function crossCheck(env: Env): string[] {
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
  if (env.CAPTCHA_PROVIDER === "hcaptcha" && !env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY) {
    // The secret alone verifies nothing, because no widget renders and the browser sends
    // no token. Every lead submission would be refused with a 403 the visitor cannot act
    // on, while the forms look entirely normal — so this is a refusal to boot.
    problems.push(
      "CAPTCHA_PROVIDER is hcaptcha but NEXT_PUBLIC_HCAPTCHA_SITE_KEY is missing — no widget would render and every lead submission would be refused",
    );
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
    if (!env.CRON_SECRET) {
      // Without it `/api/cron/purge-leads` answers 503 for ever and the retention purge
      // never runs. Nothing reports that: no error, no broken page, just personal data
      // kept past the window the consent notice promised.
      problems.push(
        "CRON_SECRET is required in production — without it the lead retention purge never runs and personal data is kept past its stated window",
      );
    }
    if (!env.NEXT_PUBLIC_MAPTILER_KEY) {
      // Without it the map falls back to OpenStreetMap's public tile server, which
      // handoff note 13 is explicit must not carry production traffic. The failure is
      // invisible from the outside — the map looks right — so it has to be caught here.
      problems.push(
        "NEXT_PUBLIC_MAPTILER_KEY is required in production — the map would fall back to OpenStreetMap's public tiles, which its usage policy forbids. It must be set at build time too; Next inlines it.",
      );
    } else if (looksLikePlaceholder(env.NEXT_PUBLIC_MAPTILER_KEY)) {
      /*
       * A key that is present but obviously fake, which the check above cannot see.
       *
       * This shipped. `get_a_free_key_from_maptiler` sat in the deployed build, every
       * tile came back 403, and the directory served an empty grey rectangle where the
       * map of Türkiye should be. Nothing reported it: the variable was set, so the boot
       * check passed, and a tile request is a browser's problem rather than the server's.
       *
       * It then cost a second round of confusion, because replacing the value in the
       * platform is not enough on its own — `NEXT_PUBLIC_*` is inlined at compile time,
       * so a redeploy that reuses the build cache can keep serving the old string. That
       * is exactly the situation this message needs to name, because from the outside it
       * looks identical to "the new key does not work".
       */
      problems.push(
        `NEXT_PUBLIC_MAPTILER_KEY is a placeholder, not a key: "${env.NEXT_PUBLIC_MAPTILER_KEY}". ` +
          "Set the real key from MapTiler Cloud → Keys. It is inlined at build time, so " +
          "redeploy with the build cache DISABLED — a cached build keeps the old value and " +
          "the map stays broken with no error anywhere.",
      );
    }
  }

  return problems;
}

/**
 * Values that are plainly not a credential.
 *
 * **Deliberately short, and it got shorter while being written.** The cost of a false
 * positive here is a refused deployment, so a marker has to be something no generated key
 * could plausibly contain. `example` and `xxxx` were both in this list until the test
 * that asserts a real key is accepted failed on `pk3IqPCbEXAMPLEkey01` — a fixture that
 * looks exactly like a real key and happens to contain the word. A key is random
 * alphanumeric; any English word is a coincidence waiting to happen, and four repeated
 * characters even more so.
 *
 * What remains are phrases a person types, not ones a generator emits. MapTiler's own
 * documentation uses the first, and it is the one that actually reached production.
 */
const PLACEHOLDER_MARKERS = [
  "get_a_free_key",
  "your_key",
  "your-key",
  "yourkey",
  "placeholder",
  "changeme",
  "change_me",
];

function looksLikePlaceholder(value: string): boolean {
  const normalised = value.trim().toLowerCase();
  return PLACEHOLDER_MARKERS.some((marker) => normalised.includes(marker));
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

/**
 * The host of a connection string, or a word saying why there isn't one.
 *
 * Host and port only. A Postgres URL carries a username and a password, an Upstash URL
 * carries a token in some forms, and a Sentry DSN is a key with a hostname attached — so
 * this deliberately reaches for `URL.host` and never the whole string. Anything that
 * throws is reported as unparseable rather than echoed back, because a malformed value
 * is exactly the case where echoing it would print a secret that had a typo in it.
 */
function hostOf(value: string | undefined): string {
  if (!value) return "none";
  try {
    return new URL(value).host || "unparseable";
  } catch {
    return "unparseable";
  }
}

/** The domain half of an address. `no-reply@campusturkey.org` becomes the domain. */
const domainOf = (address: string | undefined): string => address?.split("@")[1] ?? "none";

/**
 * What this process is actually pointed at, with no secret in it.
 *
 * **Written for the moment credentials change hands.** The developer's database, bucket
 * and mail account are being used to launch, and the client's will replace them later,
 * on a site that is already live and already holding real enquiries. The dangerous
 * failure there is not an error — it is a swap that *looks* like it worked: the
 * application boots, every page renders, and it is still writing to the old database,
 * because one variable in one environment was missed.
 *
 * Nothing in the request path reveals which backend answered it. This line does, once
 * per cold start, in terms an operator can compare against what they just set. A wrong
 * swap becomes a thing you can see in the log within a minute instead of a thing you
 * discover when the client asks where their leads went.
 *
 * Hosts, providers and identifiers only. `hostOf` exists precisely so that a connection
 * string is never printed whole, and the two secrets with no host at all — the session
 * key and the cron token — are reported as `set` or `MISSING`, never as themselves.
 */
export function configurationFingerprint(source: Env = env): Record<string, string> {
  return {
    environment: source.NODE_ENV,
    siteOrigin: source.SITE_ORIGIN,
    database: hostOf(source.DATABASE_URL),
    databaseDirect: hostOf(source.DIRECT_DATABASE_URL),
    storage:
      source.STORAGE_PROVIDER === "s3"
        ? `s3 ${source.S3_BUCKET ?? "no-bucket"} @ ${hostOf(source.S3_ENDPOINT)}`
        : source.STORAGE_PROVIDER,
    mail: source.MAIL_PROVIDER === "disabled" ? "disabled" : `${source.MAIL_PROVIDER} from ${domainOf(source.MAIL_FROM)}`,
    captcha: source.CAPTCHA_PROVIDER,
    rateLimit: hostOf(source.UPSTASH_REDIS_REST_URL),
    errorTracking: hostOf(source.SENTRY_DSN),
    payouts: source.PAYOUT_PROVIDER,
    translation: source.TRANSLATE_PROVIDER,
    searchIndexing: source.SEARCH_INDEXING,
    sessionSecret: source.SESSION_SECRET ? "set" : "MISSING",
    cronSecret: source.CRON_SECRET ? "set" : "MISSING",
  };
}
