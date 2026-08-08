/**
 * Webhook signature verification.
 *
 * This endpoint can mark a withdrawal PAID, so a forged request against it fabricates a
 * settlement. Every refusal below is tested, not just the acceptance — a verifier that
 * only proves it accepts good signatures proves nothing about the bad ones.
 */

import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifySignature, MAX_SKEW_SECONDS } from "./signature";

const SECRET = "test-webhook-secret";
const BODY = '{"id":"evt_1","type":"payout.paid","data":{"reference":"WD-2026-000001"}}';

const sign = (body: string, timestamp: string, secret = SECRET) =>
  createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");

const now = new Date("2026-08-08T12:00:00Z");
const stamp = String(Math.floor(now.getTime() / 1000));

describe("accepts a genuine callback", () => {
  it("verifies a correct signature", () => {
    const result = verifySignature({
      rawBody: BODY,
      signature: sign(BODY, stamp),
      timestamp: stamp,
      secret: SECRET,
      now,
    });
    expect(result).toEqual({ ok: true });
  });

  it("accepts a timestamp at the edge of the window", () => {
    const edge = String(Number(stamp) - MAX_SKEW_SECONDS);
    expect(
      verifySignature({ rawBody: BODY, signature: sign(BODY, edge), timestamp: edge, secret: SECRET, now }),
    ).toEqual({ ok: true });
  });
});

describe("refuses everything else", () => {
  it("refuses a missing signature", () => {
    expect(
      verifySignature({ rawBody: BODY, signature: null, timestamp: stamp, secret: SECRET, now }),
    ).toEqual({ ok: false, reason: "missing" });
  });

  it("refuses a missing timestamp", () => {
    expect(
      verifySignature({ rawBody: BODY, signature: sign(BODY, stamp), timestamp: null, secret: SECRET, now }),
    ).toEqual({ ok: false, reason: "missing" });
  });

  it("refuses a non-numeric timestamp", () => {
    expect(
      verifySignature({ rawBody: BODY, signature: sign(BODY, "abc"), timestamp: "abc", secret: SECRET, now }),
    ).toEqual({ ok: false, reason: "malformed" });
  });

  it("refuses a replayed callback from outside the window", () => {
    // The reason the timestamp is inside the signed payload at all. Without it a
    // captured request stays valid forever, and replaying "payout.paid" fabricates a
    // settlement that never happened.
    const old = String(Number(stamp) - MAX_SKEW_SECONDS - 1);
    expect(
      verifySignature({ rawBody: BODY, signature: sign(BODY, old), timestamp: old, secret: SECRET, now }),
    ).toEqual({ ok: false, reason: "stale" });
  });

  it("refuses a timestamp too far in the future", () => {
    const ahead = String(Number(stamp) + MAX_SKEW_SECONDS + 1);
    expect(
      verifySignature({ rawBody: BODY, signature: sign(BODY, ahead), timestamp: ahead, secret: SECRET, now }),
    ).toEqual({ ok: false, reason: "stale" });
  });

  it("refuses a signature made with the wrong secret", () => {
    expect(
      verifySignature({
        rawBody: BODY,
        signature: sign(BODY, stamp, "not-the-secret"),
        timestamp: stamp,
        secret: SECRET,
        now,
      }),
    ).toEqual({ ok: false, reason: "mismatch" });
  });

  it("refuses when the body has been altered after signing", () => {
    // The attack the signature exists to stop: same envelope, different reference.
    const tampered = BODY.replace("WD-2026-000001", "WD-2026-000999");
    expect(
      verifySignature({ rawBody: tampered, signature: sign(BODY, stamp), timestamp: stamp, secret: SECRET, now }),
    ).toEqual({ ok: false, reason: "mismatch" });
  });

  it("refuses when the timestamp is swapped for another valid one", () => {
    // Signature and timestamp are bound together; presenting a fresh timestamp with an
    // old signature must not verify.
    const fresh = String(Number(stamp) + 10);
    expect(
      verifySignature({ rawBody: BODY, signature: sign(BODY, stamp), timestamp: fresh, secret: SECRET, now }),
    ).toEqual({ ok: false, reason: "mismatch" });
  });

  it("refuses a signature of the wrong length rather than throwing", () => {
    // `timingSafeEqual` throws on unequal lengths, so the length check has to come
    // first — otherwise a short signature is a 500 instead of a 401.
    expect(() =>
      verifySignature({ rawBody: BODY, signature: "abc", timestamp: stamp, secret: SECRET, now }),
    ).not.toThrow();
    expect(
      verifySignature({ rawBody: BODY, signature: "abc", timestamp: stamp, secret: SECRET, now }),
    ).toEqual({ ok: false, reason: "mismatch" });
  });

  it("refuses an empty signature", () => {
    expect(
      verifySignature({ rawBody: BODY, signature: "", timestamp: stamp, secret: SECRET, now }),
    ).toEqual({ ok: false, reason: "missing" });
  });
});
