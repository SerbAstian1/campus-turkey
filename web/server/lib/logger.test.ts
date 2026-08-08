/**
 * Log redaction.
 *
 * "We redact secrets" is a claim, and an unverified claim about a log is worth less
 * than no claim, because it stops people looking. These tests assert against the
 * specific shapes this system actually logs: a payout method, a session, a lead
 * payload, an error carrying context.
 */

import { describe, it, expect } from "vitest";
import { redact } from "./logger";

describe("secrets are removed regardless of environment", () => {
  // Secrets go whether or not PII redaction is on, so both are checked with the PII
  // flag explicitly false — the weaker setting.
  const cases = [
    "password",
    "providerToken",
    "provider_token",
    "sessionToken",
    "apiKey",
    "api_key",
    "SECRET",
    "Authorization",
    "cookie",
    "idempotencyKey",
    "providerRef",
  ];

  for (const key of cases) {
    it(`removes \`${key}\``, () => {
      const result = redact({ [key]: "the-actual-value" }, false) as Record<string, unknown>;
      expect(result[key]).toBe("[redacted]");
    });
  }

  it("removes secrets nested at any depth", () => {
    const input = {
      withdrawal: {
        id: "abc",
        method: { label: "GTBank", providerToken: "tok_live_9f2b" },
      },
    };
    const result = JSON.stringify(redact(input, false));
    expect(result).not.toContain("tok_live_9f2b");
    // Non-secret siblings survive: a log that redacts everything is a log nobody uses.
    expect(result).toContain("GTBank");
    expect(result).toContain("abc");
  });

  it("removes secrets inside arrays", () => {
    const input = { methods: [{ providerToken: "tok_a" }, { providerToken: "tok_b" }] };
    const result = JSON.stringify(redact(input, false));
    expect(result).not.toMatch(/tok_a|tok_b/);
  });
});

describe("personal data is removed in production mode", () => {
  const payload = {
    email: "someone@example.com",
    phone: "+905550000000",
    name: "A Real Person",
    passport: "X1234567",
    address: "12 Somewhere Street",
    iban: "TR330006100519786457841326",
    walletAddress: "0xabc123",
    maskedDetail: "•••• 4417",
    ipAddress: "203.0.113.44",
    userAgent: "Mozilla/5.0",
  };

  it("removes every personal field when redactPii is on", () => {
    const result = JSON.stringify(redact(payload, true));
    expect(result).not.toMatch(
      /someone@example\.com|905550000000|A Real Person|X1234567|Somewhere Street|TR3300061|0xabc123|4417|203\.0\.113|Mozilla/,
    );
  });

  it("keeps them in development, where the data is fake and legibility is worth more", () => {
    const result = JSON.stringify(redact(payload, false));
    expect(result).toContain("someone@example.com");
  });

  it("keeps ids and amounts, which are what an incident is actually debugged from", () => {
    const input = {
      partnerId: "d1f0c2b4-0000-0000-0000-000000000000",
      withdrawalId: "ab000000-0000-0000-0000-000000000000",
      amountMinor: 40000,
      currency: "USD",
      status: "REQUESTED",
      durationMs: 42,
    };
    expect(redact(input, true)).toEqual(input);
  });

  it("redacts a whole lead payload rather than enumerating its fields", () => {
    // Lead payloads differ per kind and the medical one carries health data. Redacting
    // the container means a new field on a new form is safe by default rather than
    // safe once someone remembers to add it to the list.
    const result = redact({ kind: "MEDICAL", payload: { treatment: "cardiology" } }, true) as Record<
      string,
      unknown
    >;
    expect(result["payload"]).toBe("[redacted]");
    expect(result["kind"]).toBe("MEDICAL");
  });
});

describe("redact does not break on awkward values", () => {
  it("survives a circular reference instead of overflowing the stack", () => {
    // An error handler that throws turns one bad request into an outage.
    const circular: Record<string, unknown> = { id: "x" };
    circular["self"] = circular;
    expect(() => redact(circular, true)).not.toThrow();
    expect(JSON.stringify(redact(circular, true))).toContain("[circular]");
  });

  it("passes primitives through untouched", () => {
    expect(redact("plain", true)).toBe("plain");
    expect(redact(42, true)).toBe(42);
    expect(redact(null, true)).toBe(null);
    expect(redact(undefined, true)).toBe(undefined);
    expect(redact(true, true)).toBe(true);
  });

  it("preserves Date objects rather than walking their internals", () => {
    const date = new Date("2026-08-07T00:00:00.000Z");
    expect(redact({ at: date }, true)).toEqual({ at: date });
  });

  it("reduces an Error to name, message and stack", () => {
    // `redact` returns the same nominal type it was given, so an Error in becomes an
    // Error-shaped `T` out even though the value is now a plain object. The double
    // assertion is the honest way to say "the runtime shape differs from the type".
    const error = new Error("something failed");
    const result = redact({ error }, true) as unknown as { error: Record<string, unknown> };
    expect(result.error["name"]).toBe("Error");
    expect(result.error["message"]).toBe("something failed");
    expect(result.error["stack"]).toBeTypeOf("string");
  });

  it("matches key names irrespective of case and separators", () => {
    for (const key of ["API_KEY", "api-key", "apiKey", "ApiKey"]) {
      const result = redact({ [key]: "v" }, false) as Record<string, unknown>;
      expect(result[key]).toBe("[redacted]");
    }
  });
});
