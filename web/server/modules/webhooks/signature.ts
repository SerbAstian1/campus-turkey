/**
 * Webhook signature verification.
 *
 * Department 19: "an unverified webhook endpoint is an unauthenticated write endpoint."
 * This one can mark a withdrawal PAID, so anyone who can forge a request to it can make
 * the books say money arrived when it did not.
 *
 * Pure and dependency-free apart from `node:crypto`, so the comparison rules can be
 * tested without a server — which matters, because the two things that go wrong here
 * (a non-constant-time compare, and a missing timestamp check) both fail silently.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

/** How far out of date a signed request may be before it is refused. */
export const MAX_SKEW_SECONDS = 300;

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "missing" | "malformed" | "stale" | "mismatch" };

/**
 * Constant-time string comparison.
 *
 * `a === b` on a signature leaks, through timing, how many leading characters were
 * correct — which is enough to reconstruct one byte at a time. `timingSafeEqual`
 * requires equal lengths, so the length check comes first and is itself not secret:
 * a wrong-length signature is wrong regardless.
 */
function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Verify an HMAC-SHA256 signature over `${timestamp}.${rawBody}`.
 *
 * The timestamp is inside the signed payload deliberately. Signing the body alone
 * produces a signature that stays valid forever, so a captured request can be replayed
 * indefinitely — against this endpoint, replaying "withdrawal paid" is a way to
 * fabricate a settlement.
 *
 * `rawBody` must be the exact bytes received. Re-serialising the parsed JSON changes
 * key order and whitespace, and the signature will not match — which is why the route
 * reads the text before it parses.
 */
export function verifySignature(input: {
  rawBody: string;
  signature: string | null;
  timestamp: string | null;
  secret: string;
  now?: Date;
}): VerifyResult {
  const { rawBody, signature, timestamp, secret } = input;

  if (!signature || !timestamp) return { ok: false, reason: "missing" };

  const sent = Number(timestamp);
  if (!Number.isFinite(sent)) return { ok: false, reason: "malformed" };

  const now = Math.floor((input.now ?? new Date()).getTime() / 1000);
  if (Math.abs(now - sent) > MAX_SKEW_SECONDS) return { ok: false, reason: "stale" };

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  return safeEqual(expected, signature) ? { ok: true } : { ok: false, reason: "mismatch" };
}
