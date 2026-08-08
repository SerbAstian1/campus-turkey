/**
 * /api/auth/* — Better Auth's own endpoints
 *
 * Auth:  none — these are the endpoints that establish it
 * Authz: public by necessity; the library enforces credentials, CSRF and its own rate
 *        limit, and `RATE_LIMITS.auth` (10 per 5 minutes per IP) sits in front via the
 *        matcher in middleware.ts
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

import { auth } from "@/server/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST } = toNextJsHandler(auth.handler);
