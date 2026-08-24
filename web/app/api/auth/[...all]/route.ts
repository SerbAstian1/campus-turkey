/**
 * /api/auth/* — Better Auth's own endpoints
 *
 * Auth:  none — these are the endpoints that establish it
 * Authz: public by necessity; the library enforces credentials and CSRF
 *
 *   429  too many credential attempts from one address, with `Retry-After`
 *
 * ## Rate limiting, and why it is selective
 *
 * This is a catch-all. Everything Better Auth exposes arrives here: the credential
 * endpoints, but also `get-session`, which `useSession` polls on every mount, and
 * `sign-out`. Applying the credential policy to all of it would throttle a signed-in
 * partner out of their own portal for reading their session ten times, and would leave
 * someone unable to sign *out* — a self-inflicted outage in the name of security.
 *
 * So `RATE_LIMITS.auth` (10 per 5 minutes per IP) is applied to the paths that carry or
 * mint a credential, and nothing else passes through it. `CREDENTIAL_PATHS` below is the
 * list, matched on the segment after `/api/auth/`.
 *
 * The check runs before the handler, which is the point: it costs one Redis round trip
 * and returns before Better Auth hashes a password or opens a transaction.
 *
 * **What this does not claim.** The limiter fails *open* — see `enforceRateLimit`. If
 * Redis is unreachable or slower than its 200ms budget, the request proceeds unthrottled
 * and an error is logged. That is the project's existing decision, taken because a
 * limiter that fails closed turns a Redis blip into a total outage; production refuses
 * to boot without Redis configured at all, so this covers a transient outage rather than
 * a missing configuration. During such an outage the only remaining protection is Better
 * Auth's own per-instance limiter, which is weak on serverless. Stated rather than
 * implied, because the previous version of this comment described a protection that did
 * not exist.
 *
 * Sign-up is disabled at the library level (see server/lib/auth.ts): partners are
 * onboarded by Campus Turkey through the partner application form, which creates a lead
 * a human reviews. Leaving open registration on would let anyone mint a portal account
 * and reach the partner API surface.
 *
 * Handed to the library wholesale on purpose. Every hand-written line in an auth
 * endpoint is a line that can get session generation, timing comparison or token
 * rotation subtly wrong.
 */

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/server/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { toErrorResponse } from "@/server/lib/errors";
import { enforceRateLimit, RATE_LIMITS } from "@/server/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Path segments, after `/api/auth/`, that carry or mint a credential.
 *
 * Matched by prefix so a sub-path inherits its parent's protection —
 * `sign-in/email` is covered by `sign-in`, and a provider added later is covered the
 * day it appears rather than the day somebody remembers this file.
 *
 * `sign-up` is here although `disableSignUp` closes it: the two controls answer to
 * different owners, and this one should not quietly lapse if that flag is ever flipped.
 *
 * Deliberately absent: `get-session` (polled by `useSession` on every mount) and
 * `sign-out` (throttling it strands a signed-in user). Neither accepts a credential.
 */
const CREDENTIAL_PATHS = [
  "sign-in",
  "sign-up",
  "forget-password",
  "reset-password",
  "change-password",
  "change-email",
  "email-otp",
  "verify-email",
  "send-verification-email",
] as const;

/** True when this request is an attempt at a credential rather than a session read. */
function carriesCredential(url: string): boolean {
  const path = new URL(url).pathname;
  const marker = "/api/auth/";
  const index = path.indexOf(marker);
  if (index === -1) return false;

  // Locale prefixes never reach this route, but slicing from the marker rather than
  // assuming position keeps the match correct if that ever changes.
  const rest = path.slice(index + marker.length).replace(/^\/+/, "");
  return CREDENTIAL_PATHS.some(
    (candidate) => rest === candidate || rest.startsWith(`${candidate}/`),
  );
}

const handlers = toNextJsHandler(auth.handler);

/**
 * Enforce, then delegate.
 *
 * The refusal is built with `toErrorResponse` so a 429 from here is byte-identical to a
 * 429 from any `route()` endpoint — same envelope, same `Retry-After`, same
 * `x-request-id`. A client that already handles one handles this.
 */
function guarded(handler: (request: Request) => Promise<Response>) {
  return async function handle(request: Request): Promise<Response> {
    if (carriesCredential(request.url)) {
      try {
        await enforceRateLimit(RATE_LIMITS.auth, { request, scope: "ip" });
      } catch (error) {
        const requestId = randomUUID();
        const { status, body, headers } = toErrorResponse(error, requestId);
        return NextResponse.json(body, {
          status,
          headers: { ...headers, "x-request-id": requestId, "cache-control": "no-store" },
        });
      }
    }

    return handler(request);
  };
}

export const GET = guarded(handlers.GET);
export const POST = guarded(handlers.POST);
