/**
 * POST /api/partner/payout-methods/setup-token — mint a provider setup token
 *
 * Auth:  required (session with a partner record)
 * Authz: the token is minted against `session.partner.id`; a partner cannot mint one
 *        for another partner because no partner id is accepted from the request
 *
 *   200  { token: string, expiresAt: string }
 *   400  validation failed (unknown `kind`)
 *   401  no session
 *   403  session is not a partner, or the origin check failed
 *   422  payouts not configured — see open question 3
 *   429  rate limited — 30/min per user
 *   502  the payout provider was unreachable or refused, after an 8s timeout
 *
 * This is step 1 of the vaulting flow. The token is short-lived and scoped by the
 * provider; the API key that mints it never leaves this server.
 */

import { route } from "@/server/http/handler";
import { requirePartner } from "@/server/http/session";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import {
  createSetupToken,
  setupTokenBody,
} from "@/server/modules/payout-methods/payout-methods.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route({
  access: { kind: "partner" },
  rateLimit: RATE_LIMITS.partnerWrite,
  body: setupTokenBody,
  handler: async ({ body, session, log }) => {
    const partner = requirePartner(session);
    return createSetupToken(body, partner.id, log);
  },
});
