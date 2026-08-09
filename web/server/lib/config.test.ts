/**
 * Environment intake.
 *
 * This exists because of a real failure: `.env.example` ships every optional key with an
 * empty value, so copying it and filling in only what you need produced
 *
 *     Invalid environment configuration:
 *       UPSTASH_REDIS_REST_URL: Invalid url
 *       PAYOUT_API_BASE: Invalid url
 *       MAIL_FROM: Invalid email
 *       SENTRY_DSN: Invalid url
 *
 * and the app refused to boot over four variables that were deliberately left out.
 * `z.string().url().optional()` rejects `""` rather than skipping it. The refusal-to-boot
 * guarantee is worth keeping, which is exactly why it must not cry wolf on a correct
 * config — a boot check that fires on a working setup is one people learn to bypass.
 */

import { describe, expect, it } from "vitest";
import { withoutBlanks } from "./config";

describe("withoutBlanks", () => {
  it("drops variables that are present but empty", () => {
    expect(withoutBlanks({ SENTRY_DSN: "", MAIL_FROM: "" })).toEqual({});
  });

  it("drops whitespace-only values, which a trailing space in a .env produces", () => {
    expect(withoutBlanks({ CAPTCHA_SECRET: "   " })).toEqual({});
  });

  it("keeps real values untouched", () => {
    expect(withoutBlanks({ SENTRY_DSN: "https://x@y.ingest.sentry.io/1", LOG_LEVEL: "info" }))
      .toEqual({ SENTRY_DSN: "https://x@y.ingest.sentry.io/1", LOG_LEVEL: "info" });
  });

  it("keeps a value whose padding is meaningful once trimmed to non-empty", () => {
    // Not trimmed, only tested for blankness — a secret with a leading space is still
    // that secret, and silently trimming it would produce a signature mismatch that is
    // very hard to trace back to here.
    expect(withoutBlanks({ SESSION_SECRET: " abc " })).toEqual({ SESSION_SECRET: " abc " });
  });

  it("drops undefined values", () => {
    expect(withoutBlanks({ A: undefined, B: "1" })).toEqual({ B: "1" });
  });

  /**
   * A blank *required* variable must still fail — it is absent, and absent is a refusal.
   * This asserts the intake does not quietly supply a default for one.
   */
  it("does not invent a value for a required variable left blank", () => {
    expect(withoutBlanks({ DATABASE_URL: "" })).not.toHaveProperty("DATABASE_URL");
  });
});
