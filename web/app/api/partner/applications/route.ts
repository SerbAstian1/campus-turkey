/**
 * GET /api/partner/applications — applications this partner referred
 *
 * Auth:  required (session with a partner record)
 * Authz: PARTNER_READ_RELEVANT_APPLICATION_STATUS
 *
 *   200  { items, nextCursor }
 *   401  no session
 *   403  not a partner
 *   429  rate limited
 *
 * The scope is `session.partner.id`. No partner id is read from the request, which is
 * what makes §89's "Partner A must not access Partner B's application" a property of the
 * code rather than a rule each query has to remember.
 *
 * §62 limits what a partner sees: their student, the application number, university,
 * programme, status and timeline. Not internal notes, not staff conversations, not other
 * partners' students. That limit is expressed by `APPLICATION_FIELDS`, which has no
 * internal columns in it at all.
 */

import { z } from "zod";
import { route } from "@/server/http/handler";
import { requirePartner } from "@/server/http/session";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { listApplicationsForReferrer } from "@/server/modules/applications/applications.query";
import { ALL_STATUSES } from "@/server/modules/applications/application.state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const listQuery = z.object({
  status: z.enum(ALL_STATUSES as [string, ...string[]]).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().uuid().optional(),
});

export const GET = route({
  access: { kind: "permission", require: ["PARTNER_READ_RELEVANT_APPLICATION_STATUS"] },
  rateLimit: RATE_LIMITS.partnerRead,
  query: listQuery,
  handler: async ({ query, session }) => {
    const partner = requirePartner(session);
    return listApplicationsForReferrer(
      { partnerId: partner.id },
      { limit: query.limit, ...(query.status ? { status: query.status } : {}), ...(query.cursor ? { cursor: query.cursor } : {}) },
    );
  },
});
