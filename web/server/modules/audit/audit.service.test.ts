/**
 * Audit redaction — brief §26.
 *
 * §26 names what must never be logged: passwords, session tokens, reset tokens,
 * credentials. This is tested carefully because of where the failure lands. The audit log
 * is append-only by design, so a secret written here cannot be deleted afterwards — it is
 * the most durable place in the system for a mistake of this kind.
 *
 * A database CHECK refuses the row as a second line, but a constraint that fires means an
 * audit write failed, which is its own incident. These rules exist so it never fires.
 */

import { describe, expect, it } from "vitest";
import { redactMetadata } from "./audit.service";

describe("forbidden keys", () => {
  it.each([
    "password",
    "passwordHash",
    "token",
    "sessionToken",
    "accessToken",
    "refreshToken",
    "resetToken",
    "claimCode",
    "claim_code",
    "otp",
    "secret",
    "apiKey",
    "api_key",
    "authorization",
    "cookie",
    "signature",
  ])("redacts %s", (key) => {
    expect(redactMetadata({ [key]: "sensitive" })).toEqual({ [key]: "[redacted]" });
  });

  it("is case-insensitive", () => {
    expect(redactMetadata({ PASSWORD: "x", Token: "y", ApiKey: "z" }))
      .toEqual({ PASSWORD: "[redacted]", Token: "[redacted]", ApiKey: "[redacted]" });
  });

  it("catches a forbidden term inside a longer key", () => {
    // `userPassword` and `x-api-key` are the shapes these actually arrive in.
    expect(redactMetadata({ userPassword: "x", "x-api-key": "y" }))
      .toEqual({ userPassword: "[redacted]", "x-api-key": "[redacted]" });
  });

  it("redacts nested values", () => {
    expect(redactMetadata({ user: { name: "Amina", password: "hunter2" } }))
      .toEqual({ user: { name: "Amina", password: "[redacted]" } });
  });

  it("redacts inside arrays", () => {
    expect(redactMetadata({ attempts: [{ token: "a" }, { token: "b" }] }))
      .toEqual({ attempts: [{ token: "[redacted]" }, { token: "[redacted]" }] });
  });
});

describe("what survives", () => {
  it("keeps ordinary fields", () => {
    const entry = {
      applicationNumber: "CT-2026-00041",
      from: "SUBMITTED",
      to: "UNDER_REVIEW",
      count: 3,
      ok: true,
    };
    expect(redactMetadata(entry)).toEqual(entry);
  });

  it("keeps null and undefined as they are", () => {
    expect(redactMetadata({ a: null, b: undefined })).toEqual({ a: null, b: undefined });
  });

  it("does not try to detect secrets by their shape", () => {
    // A string that looks like a token under a legitimate key is kept. Guessing by shape
    // would redact genuine content — application numbers, references, hashes of public
    // things — and an audit log full of [redacted] answers nothing.
    expect(redactMetadata({ reference: "eyJhbGciOiJIUzI1NiJ9" }))
      .toEqual({ reference: "eyJhbGciOiJIUzI1NiJ9" });
  });
});

describe("hostile input", () => {
  /**
   * Metadata comes from callers, and an audit write must never be the thing that crashes
   * a request. Depth is capped rather than trusted.
   */
  it("stops at a depth limit rather than recursing forever", () => {
    let deep: Record<string, unknown> = { value: "bottom" };
    for (let i = 0; i < 40; i++) deep = { nested: deep };

    expect(() => redactMetadata(deep)).not.toThrow();
    expect(JSON.stringify(redactMetadata(deep))).toContain("[redacted]");
  });

  it("survives a cyclic object", () => {
    const cyclic: Record<string, unknown> = { name: "loop" };
    cyclic["self"] = cyclic;

    expect(() => redactMetadata(cyclic)).not.toThrow();
  });

  it("caps very long arrays", () => {
    const long = { items: Array.from({ length: 500 }, (_, i) => i) };
    const result = redactMetadata(long) as { items: number[] };
    expect(result.items).toHaveLength(50);
  });
});

describe("over-redaction is the safe direction", () => {
  /**
   * `passwordPolicy` contains no secret and is stripped anyway, because the matcher works
   * by substring. That is deliberate: the cost of losing a harmless field from an audit
   * entry is a slightly less useful record, and the cost of the opposite is a credential
   * in an append-only table.
   */
  it("strips a harmless key that contains a forbidden term", () => {
    expect(redactMetadata({ passwordPolicy: "12 characters" }))
      .toEqual({ passwordPolicy: "[redacted]" });
  });
});
