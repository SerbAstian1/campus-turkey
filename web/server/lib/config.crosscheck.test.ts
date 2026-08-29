/**
 * The rules that decide whether this deployment is allowed to start.
 *
 * `crossCheck` is the whole "refuse to boot rather than fail at 3am" guarantee, and until
 * now not one of its rules had a test. That is an odd gap for a function whose entire
 * purpose is to be right about a configuration nobody will look at again: the rules only
 * ever fire on a machine that is misconfigured, so a rule that silently stopped working
 * would be indistinguishable from a rule that never fired because everything was fine.
 *
 * Two directions matter and both are covered.
 *
 * A rule that **fails to fire** lets a broken deployment start. Storage on a serverless
 * disk that evaporates with the next cold start, taking a student's passport with it. A
 * captcha secret with no site key, so every enquiry form refuses every submission with a
 * message the visitor cannot act on. A retention purge that never runs.
 *
 * A rule that **fires when it should not** is the more insidious failure, because the
 * response to a boot check that cries wolf is to bypass the boot check. That already
 * happened once here, over four optional variables left deliberately blank, and it is why
 * `withoutBlanks` exists. So the valid-configuration cases below are as load-bearing as
 * the invalid ones.
 */

import { describe, expect, it } from "vitest";
import { crossCheck, type Env } from "./config";

/**
 * A production configuration with every required variable present.
 *
 * The baseline is deliberately *valid*, so each test removes exactly one thing and the
 * failure it asserts can only have come from that. A baseline that was already broken
 * would let a test pass for the wrong reason.
 */
function productionEnv(overrides: Partial<Env> = {}): Env {
  return {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://u:p@host/db",
    DIRECT_DATABASE_URL: "postgresql://u:p@host/db",
    SITE_ORIGIN: "https://campusturkey.org",
    SESSION_SECRET: "a".repeat(32),
    TRANSLATE_PROVIDER: "disabled",
    UPSTASH_REDIS_REST_URL: "https://x.upstash.io",
    UPSTASH_REDIS_REST_TOKEN: "token",
    PAYOUT_PROVIDER: "unconfigured",
    MAIL_PROVIDER: "resend",
    MAIL_API_KEY: "key",
    MAIL_FROM: "no-reply@campusturkey.org",
    STORAGE_PROVIDER: "s3",
    S3_BUCKET: "bucket",
    S3_REGION: "eu-west-2",
    S3_ACCESS_KEY_ID: "id",
    S3_SECRET_ACCESS_KEY: "secret",
    S3_ENDPOINT: "https://s3.eu-west-2.amazonaws.com",
    S3_FORCE_PATH_STYLE: "false",
    SENTRY_DSN: "https://x@o0.ingest.sentry.io/0",
    NEXT_PUBLIC_MAPTILER_KEY: "maptiler",
    CRON_SECRET: "cron",
    CAPTCHA_PROVIDER: "hcaptcha",
    CAPTCHA_SECRET: "captcha",
    NEXT_PUBLIC_HCAPTCHA_SITE_KEY: "sitekey",
    MAINTENANCE_MODE: "off",
    MAINTENANCE_RETRY_AFTER_SECONDS: 600,
    SEARCH_INDEXING: "on",
    LOG_LEVEL: "info",
    ...overrides,
  } as Env;
}

/** The rule that fires, matched loosely so rewording the message does not fail a test. */
const complaint = (env: Env, fragment: string) =>
  crossCheck(env).some((problem) => problem.toLowerCase().includes(fragment.toLowerCase()));

describe("a complete production configuration", () => {
  it("raises nothing", () => {
    expect(crossCheck(productionEnv())).toEqual([]);
  });

  it("still raises nothing with the optional providers left off", () => {
    // The cry-wolf case. Translation and payouts are deliberately unconfigured at launch,
    // and a boot check that refused this would be refusing a correct setup.
    expect(
      crossCheck(productionEnv({ TRANSLATE_PROVIDER: "disabled", PAYOUT_PROVIDER: "unconfigured" })),
    ).toEqual([]);
  });
});

describe("production rules that protect people's data", () => {
  it("refuses local file storage, which a serverless cold start erases", () => {
    expect(complaint(productionEnv({ STORAGE_PROVIDER: "local" }), "cold start")).toBe(true);
  });

  it("refuses to start with storage unconfigured", () => {
    expect(complaint(productionEnv({ STORAGE_PROVIDER: "unconfigured" }), "STORAGE_PROVIDER")).toBe(true);
  });

  it("refuses a missing retention purge token", () => {
    // Newly enforced. Without it the purge answers 503 for ever and leads outlive the
    // window the consent notice promised, with nothing anywhere reporting it.
    expect(complaint(productionEnv({ CRON_SECRET: undefined }), "CRON_SECRET")).toBe(true);
  });

  it("refuses http, because the session cookie is Secure-only", () => {
    expect(complaint(productionEnv({ SITE_ORIGIN: "http://campusturkey.org" }), "https")).toBe(true);
  });
});

describe("production rules that keep the site usable", () => {
  it("refuses a disabled captcha on public lead forms", () => {
    expect(complaint(productionEnv({ CAPTCHA_PROVIDER: "disabled" }), "CAPTCHA_PROVIDER")).toBe(true);
  });

  it("refuses hcaptcha with no site key, which would reject every submission", () => {
    expect(
      complaint(productionEnv({ NEXT_PUBLIC_HCAPTCHA_SITE_KEY: undefined }), "NEXT_PUBLIC_HCAPTCHA_SITE_KEY"),
    ).toBe(true);
  });

  it("refuses a disabled mail provider, which would lock every non-staff user out", () => {
    // Partners, representatives and students are all created passwordless and set their
    // own password through an emailed link. No mail means no sign-in, for ever.
    expect(complaint(productionEnv({ MAIL_PROVIDER: "disabled" }), "MAIL_PROVIDER")).toBe(true);
  });

  it("refuses missing rate limiting, which serverless cannot do in process", () => {
    expect(complaint(productionEnv({ UPSTASH_REDIS_REST_URL: undefined }), "Upstash")).toBe(true);
  });

  it("refuses a missing error tracker", () => {
    expect(complaint(productionEnv({ SENTRY_DSN: undefined }), "SENTRY_DSN")).toBe(true);
  });

  it("refuses a missing map key, which would silently fall back to OpenStreetMap", () => {
    expect(complaint(productionEnv({ NEXT_PUBLIC_MAPTILER_KEY: undefined }), "MAPTILER")).toBe(true);
  });
});

describe("provider rules that apply in every environment", () => {
  it("refuses a payout provider with no webhook secret", () => {
    /*
     * The sharpest of these. An unverified webhook endpoint is an unauthenticated write
     * endpoint that can mark a withdrawal as paid, so this is a refusal to boot rather
     * than a warning.
     */
    expect(
      complaint(
        productionEnv({ PAYOUT_PROVIDER: "wise", PAYOUT_API_KEY: "k", PAYOUT_API_BASE: "https://api.wise.com" }),
        "PAYOUT_WEBHOOK_SECRET",
      ),
    ).toBe(true);
  });

  it("refuses a translation provider with no key", () => {
    expect(complaint(productionEnv({ TRANSLATE_PROVIDER: "deepl" }), "TRANSLATE_API_KEY")).toBe(true);
  });

  it("applies the storage rule outside production too", () => {
    expect(
      complaint(productionEnv({ NODE_ENV: "development", STORAGE_PROVIDER: "s3", S3_BUCKET: undefined }), "S3_BUCKET"),
    ).toBe(true);
  });
});

describe("development is not held to the production rules", () => {
  it("allows local storage, no mail, no Sentry and no captcha", () => {
    const dev = productionEnv({
      NODE_ENV: "development",
      SITE_ORIGIN: "http://localhost:3000",
      STORAGE_PROVIDER: "local",
      MAIL_PROVIDER: "disabled",
      SENTRY_DSN: undefined,
      CAPTCHA_PROVIDER: "disabled",
      CAPTCHA_SECRET: undefined,
      NEXT_PUBLIC_HCAPTCHA_SITE_KEY: undefined,
      UPSTASH_REDIS_REST_URL: undefined,
      UPSTASH_REDIS_REST_TOKEN: undefined,
      NEXT_PUBLIC_MAPTILER_KEY: undefined,
      CRON_SECRET: undefined,
    });

    // Every one of these is a refusal in production and none of them is here. Local
    // development that required nine third-party accounts would simply not be done.
    expect(crossCheck(dev)).toEqual([]);
  });
});
