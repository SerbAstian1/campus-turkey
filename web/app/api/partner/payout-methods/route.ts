/**
 * GET  /api/partner/payout-methods — list connected methods
 * POST /api/partner/payout-methods — confirm a vaulted method
 *
 * Auth:  required (session with a partner record)
 * Authz: scoped to `session.partner.id`
 *
 * GET
 *   200  PayoutMethod[] — never includes the provider token
 *   401  no session
 *   403  session is not a partner
 *   429  rate limited
 *
 * POST
 *   200  PayoutMethod
 *   400  validation failed (missing or malformed providerRef)
 *   401  no session
 *   403  session is not a partner, or the origin check failed
 *   422  payouts not configured — see open question 3
 *   429  rate limited
 *   502  the payout provider was unreachable or refused, after an 8s timeout
 *
 * The client calls this with only a `providerRef`; the account details went straight
 * from the partner's browser to the provider's hosted field. See features/portal/
 * payouts.ts for the reasoning, which is not optional.
 */

import { route } from "@/server/http/handler";
import { requirePartner } from "@/server/http/session";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { db } from "@/server/lib/db";
import {
  listMethods,
  confirmPayoutMethod,
  confirmMethodBody,
} from "@/server/modules/payout-methods/payout-methods.service";
import { toPayoutMethodDto } from "@/server/types/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({
  access: { kind: "partner" },
  rateLimit: RATE_LIMITS.partnerRead,
  handler: async ({ session }) => {
    const partner = requirePartner(session);
    const methods = await listMethods(db, partner.id);
    return methods.map(toPayoutMethodDto);
  },
});

export const POST = route({
  access: { kind: "partner" },
  rateLimit: RATE_LIMITS.partnerWrite,
  body: confirmMethodBody,
  handler: async ({ body, session, log }) => {
    const partner = requirePartner(session);
    const created = await confirmPayoutMethod(db, partner.id, body, log);
    return toPayoutMethodDto(created);
  },
});
