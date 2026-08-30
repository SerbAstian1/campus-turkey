/**
 * The boot line that says what this process is pointed at, and what it must never say.
 *
 * The line exists for one specific day: the developer's database, bucket and mail
 * account are being used to launch, and the client's will replace them later on a site
 * that is already live and already holding real enquiries. The failure that costs money
 * there is not an error — it is a swap that *looks* like it worked. The application
 * boots, every page renders, and it is still writing to the old database because one
 * variable in one environment was missed. Nothing in the request path would reveal that.
 *
 * So the fingerprint has to be specific enough to compare against what was just set, and
 * that pulls directly against the second requirement: **a log is the most widely readable
 * surface in most deployments.** Vercel's log stream is visible to everyone on the team,
 * it is shipped to whatever aggregator is attached, and it is retained. A connection
 * string printed there is a credential published.
 *
 * The tests below are mostly the second requirement. Each one takes a value that would be
 * damaging in a log, puts it in the configuration, and asserts it does not come out.
 */

import { describe, expect, it } from "vitest";
import { configurationFingerprint, type Env } from "./config";

const PASSWORD = "sup3r-s3cret-pgpassword";
const S3_SECRET = "wJalrXUtnFEMI-EXAMPLEKEY";
const SESSION = "z".repeat(40);
const CRON = "cron-token-value";
const SENTRY_KEY = "abc123sentrypublickey";

function env(overrides: Partial<Env> = {}): Env {
  return {
    NODE_ENV: "production",
    DATABASE_URL: `postgresql://campus_app:${PASSWORD}@ep-cold-band-pooler.eu-west-2.aws.neon.tech/campus?sslmode=require`,
    DIRECT_DATABASE_URL: `postgresql://campus_app:${PASSWORD}@ep-cold-band.eu-west-2.aws.neon.tech/campus`,
    SITE_ORIGIN: "https://campusturkey.org",
    SESSION_SECRET: SESSION,
    TRANSLATE_PROVIDER: "disabled",
    UPSTASH_REDIS_REST_URL: "https://apn1-fake-12345.upstash.io",
    UPSTASH_REDIS_REST_TOKEN: "upstash-token-value",
    PAYOUT_PROVIDER: "unconfigured",
    MAIL_PROVIDER: "resend",
    MAIL_API_KEY: "re_live_key_value",
    MAIL_FROM: "no-reply@campusturkey.org",
    STORAGE_PROVIDER: "s3",
    S3_BUCKET: "campus-turkey-documents",
    S3_REGION: "eu-west-2",
    S3_ACCESS_KEY_ID: "AKIAIOSFODNN7EXAMPLE",
    S3_SECRET_ACCESS_KEY: S3_SECRET,
    S3_ENDPOINT: "https://s3.eu-west-2.amazonaws.com",
    S3_FORCE_PATH_STYLE: "false",
    SENTRY_DSN: `https://${SENTRY_KEY}@o12345.ingest.sentry.io/678`,
    NEXT_PUBLIC_MAPTILER_KEY: "maptiler-key",
    CRON_SECRET: CRON,
    CAPTCHA_PROVIDER: "hcaptcha",
    CAPTCHA_SECRET: "0xcaptcha-secret",
    NEXT_PUBLIC_HCAPTCHA_SITE_KEY: "site-key",
    MAINTENANCE_MODE: "off",
    MAINTENANCE_RETRY_AFTER_SECONDS: 600,
    SEARCH_INDEXING: "on",
    LOG_LEVEL: "info",
    ...overrides,
  } as Env;
}

/** Everything the fingerprint emits, as one string, which is how a log line reads. */
const asLogLine = (source = env()) => JSON.stringify(configurationFingerprint(source));

describe("the fingerprint never prints a secret", () => {
  it("keeps the database password out, while still naming the host", () => {
    const line = asLogLine();

    expect(line).not.toContain(PASSWORD);
    // The host is the whole point: it is what an operator compares against the value
    // they just pasted into the platform.
    expect(line).toContain("ep-cold-band-pooler.eu-west-2.aws.neon.tech");
  });

  it("keeps the database username out", () => {
    // `URL.host` excludes userinfo. A `URL.href` or a naive split would not.
    expect(asLogLine()).not.toContain("campus_app");
  });

  it("keeps storage credentials out, while naming the bucket", () => {
    const line = asLogLine();

    expect(line).not.toContain(S3_SECRET);
    expect(line).not.toContain("AKIAIOSFODNN7EXAMPLE");
    expect(line).toContain("campus-turkey-documents");
  });

  it("keeps the Sentry key out of the DSN", () => {
    // A DSN reads like a URL and is a credential. Only its host is reported.
    const line = asLogLine();

    expect(line).not.toContain(SENTRY_KEY);
    expect(line).toContain("o12345.ingest.sentry.io");
  });

  it("keeps the mail and rate-limit tokens out", () => {
    const line = asLogLine();

    expect(line).not.toContain("re_live_key_value");
    expect(line).not.toContain("upstash-token-value");
  });

  it("reports the two secrets that have no host as set, not as themselves", () => {
    const line = asLogLine();

    expect(line).not.toContain(SESSION);
    expect(line).not.toContain(CRON);
    expect(configurationFingerprint(env()).sessionSecret).toBe("set");
    expect(configurationFingerprint(env()).cronSecret).toBe("set");
  });

  it("does not echo a malformed connection string", () => {
    /*
     * The case where echoing would be most tempting and most dangerous. A value with a
     * typo still contains the password, and "unparseable" is all an operator needs to
     * know to go and look at what they pasted.
     */
    const broken = `postgres//campus_app:${PASSWORD}@host/db`;
    const line = asLogLine(env({ DATABASE_URL: broken }));

    expect(line).not.toContain(PASSWORD);
    expect(configurationFingerprint(env({ DATABASE_URL: broken })).database).toBe("unparseable");
  });
});

describe("the fingerprint says enough to verify a swap", () => {
  it("names every backend an operator would change", () => {
    const print = configurationFingerprint(env());

    // If a key is missing here, a swap of that service cannot be confirmed from the log,
    // which is the one thing this exists to make possible.
    for (const key of ["database", "storage", "mail", "rateLimit", "errorTracking", "siteOrigin"]) {
      expect(print[key], key).toBeTruthy();
    }
  });

  it("shows the mail domain, so a swap to the client's sender is visible", () => {
    expect(configurationFingerprint(env()).mail).toBe("resend from campusturkey.org");
  });

  it("distinguishes the pooled and direct databases, which are swapped as a pair", () => {
    const print = configurationFingerprint(env());

    // Setting one and forgetting the other is the classic half-done swap: the site reads
    // from the new database and migrations still run against the old one.
    expect(print.database).not.toBe(print.databaseDirect);
  });

  it("says MISSING rather than nothing when a required secret is absent", () => {
    const print = configurationFingerprint(env({ CRON_SECRET: undefined }));

    // An absent key rendering as an empty string reads like a value nobody looked at.
    expect(print.cronSecret).toBe("MISSING");
  });

  it("reports a disabled provider by name rather than pretending it is configured", () => {
    expect(configurationFingerprint(env({ MAIL_PROVIDER: "disabled" })).mail).toBe("disabled");
    expect(configurationFingerprint(env({ STORAGE_PROVIDER: "local" })).storage).toBe("local");
  });

  it("reports whether this deployment is hidden from search engines", () => {
    // The preview and the live site differ by exactly this, and confusing them is how a
    // staging site gets indexed or a real one does not.
    expect(configurationFingerprint(env({ SEARCH_INDEXING: "off" })).searchIndexing).toBe("off");
  });
});
