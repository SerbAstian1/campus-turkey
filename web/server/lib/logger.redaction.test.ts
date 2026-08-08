/**
 * Regression tests for the two redaction rules that are easy to get subtly wrong.
 *
 * Both of these were real defects found in review rather than hypotheticals.
 */

import { describe, it, expect } from "vitest";
import { redact } from "./logger";

describe("short patterns do not match by substring", () => {
  // `ip` as a substring matches `description`, `recipient` and `zip`. Redacting those
  // loses context nobody would know had gone missing, because a redacted log looks
  // exactly like a log with nothing to say.
  it("keeps `description`, which contains the letters i-p", () => {
    const result = redact({ description: "6 confirmed registrations" }, true) as Record<
      string,
      unknown
    >;
    expect(result["description"]).toBe("6 confirmed registrations");
  });

  it("keeps `recipient`", () => {
    const result = redact({ recipient: "finance" }, true) as Record<string, unknown>;
    expect(result["recipient"]).toBe("finance");
  });

  it("still redacts an actual IP field", () => {
    for (const key of ["ip", "ipAddress", "clientIp", "remoteIp"]) {
      const result = redact({ [key]: "203.0.113.44" }, true) as Record<string, unknown>;
      expect(result[key]).toBe("[redacted]");
    }
  });
});

describe("basis and period survive redaction", () => {
  // These are the two strings a partner reads on their own withdrawal. If they are
  // redacted, a support conversation about "which period was this?" has no answer in
  // the log.
  it("keeps the withdrawal's display labels", () => {
    const input = {
      withdrawalId: "ab000000-0000-0000-0000-000000000000",
      period: "2026-03",
      basis: "6 confirmed registrations",
      amountMinor: 40000,
    };
    expect(redact(input, true)).toEqual(input);
  });
});
