/**
 * GET /api/representative/applications — applications this representative referred
 *
 * Auth:  required (session with a representative profile)
 * Authz: REPRESENTATIVE_READ_RELEVANT_APPLICATION_STATUS
 *
 *   200  { items, nextCursor }
 *   401  no session
 *   403  not a representative
 *   429  rate limited
 *
 * The partner endpoint's twin, and deliberately a separate file. The query is shared;
 * the scope and the permission are not. §63 applies the same limits §62 does: only the
 * students attributed to this representative, and never internal operational detail.
 */

import { z } from "zod";
import { route } from "@/server/http/handler";
import { requireRepresentative } from "@/server/http/session";
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
  access: { kind: "permission", require: ["REPRESENTATIVE_READ_RELEVANT_APPLICATION_STATUS"] },
  rateLimit: RATE_LIMITS.partnerRead,
  query: listQuery,
  handler: async ({ query, session }) => {
    const representative = requireRepresentative(session);
    return listApplicationsForReferrer(
      { representativeId: representative.id },
      { limit: query.limit, ...(query.status ? { status: query.status } : {}), ...(query.cursor ? { cursor: query.cursor } : {}) },
    );
  },
});
