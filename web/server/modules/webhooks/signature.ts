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

/**
 * Verify a Svix-format signature, which is what Resend sends.
 *
 * A second function rather than a parameter on the first, because almost every detail
 * differs and a flag would hide that: Svix signs `${id}.${timestamp}.${body}` rather than
 * `${timestamp}.${body}`, the secret is base64 behind a `whsec_` prefix rather than the
 * literal string, the digest is base64 rather than hex, and the header carries a
 * space-separated *list* of versioned signatures rather than one value.
 *
 * That list is the part worth stating. Svix sends every currently-valid signature during
 * a secret rotation, so checking only the first would break the endpoint for the whole
 * overlap window. Each entry is `v1,<base64>`; anything not `v1` is a scheme this code
 * does not implement and is skipped rather than guessed at.
 *
 * The comparison stays constant-time and the loop does not exit early on a match, so the
 * work done is the same whether the first candidate matched or the last one did.
 */
export function verifySvixSignature(input: {
  rawBody: string;
  id: string | null;
  timestamp: string | null;
  signature: string | null;
  secret: string;
  now?: Date;
}): VerifyResult {
  const { rawBody, id, timestamp, signature, secret } = input;

  if (!id || !timestamp || !signature) return { ok: false, reason: "missing" };

  const sent = Number(timestamp);
  if (!Number.isFinite(sent)) return { ok: false, reason: "malformed" };

  const now = Math.floor((input.now ?? new Date()).getTime() / 1000);
  if (Math.abs(now - sent) > MAX_SKEW_SECONDS) return { ok: false, reason: "stale" };

  // `whsec_` is a label, not part of the key. Signing with the prefix still included is
  // the usual reason a correct-looking implementation never matches.
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  if (key.length === 0) return { ok: false, reason: "malformed" };

  const expected = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest("base64");

  let matched = false;
  for (const candidate of signature.split(" ")) {
    const [version, value] = candidate.split(",", 2);
    if (version !== "v1" || !value) continue;
    if (safeEqual(expected, value)) matched = true;
  }

  return matched ? { ok: true } : { ok: false, reason: "mismatch" };
}
