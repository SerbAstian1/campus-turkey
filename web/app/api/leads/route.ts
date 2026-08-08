/**
 * POST /api/leads — Apply, Contact, Partner, Representative and Medical forms
 *
 * Auth:  none — public by design. This is the front door of the business.
 * Authz: public. Abuse is controlled by the captcha and the rate limit, not by identity.
 *
 *   200  { ok: true }
 *   400  validation failed — includes an unticked consent box, which is a 400 and not
 *        a silent store; see `consent: z.literal(true)` in leads.service.ts
 *   403  captcha verification failed, or the origin check failed
 *   422  no email address in the payload
 *   429  rate limited — 5 per 10 minutes per IP
 *   500  unexpected
 *
 * A contact form that silently drops messages is worse than no contact form, because
 * the visitor believes they reached you. Every failure path above returns a status the
 * client can render; none of them returns 200 without a stored row.
 */

import { type NextRequest } from "next/server";
import { route } from "@/server/http/handler";
import { RATE_LIMITS, clientIp, ipPrefix } from "@/server/lib/ratelimit";
import { db } from "@/server/lib/db";
import { submitLead, submitLeadBody } from "@/server/modules/leads/leads.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route({
  access: { kind: "public" },
  rateLimit: RATE_LIMITS.leads,
  body: submitLeadBody,
  handler: async ({ body, request, log }) => {
    const ip = clientIp((request as NextRequest).headers);
    return submitLead(db, body, { ip, ipPrefix: ipPrefix(ip) }, log);
  },
});
