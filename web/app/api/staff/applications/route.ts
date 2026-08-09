/**
 * GET /api/staff/applications — every application, filtered
 *
 * Auth:  required (staff session)
 * Authz: READ_APPLICATIONS
 *
 *   200  { items, nextCursor }
 *   401  no session
 *   403  lacks the permission
 *   429  rate limited
 *
 * Staff see every application, which is the difference between this and the portal
 * endpoints: those scope to the caller, this one deliberately does not. That is why the
 * permission is `READ_APPLICATIONS` rather than one of the `*_OWN_*` grants.
 */

import { z } from "zod";
import { route } from "@/server/http/handler";
import { db } from "@/server/lib/db";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { APPLICATION_FIELDS } from "@/server/modules/applications/applications.service";
import { ALL_STATUSES } from "@/server/modules/applications/application.state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const listQuery = z.object({
  status: z.enum(ALL_STATUSES as [string, ...string[]]).optional(),
  universityId: z.string().uuid().optional(),
  partnerId: z.string().uuid().optional(),
  representativeId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().uuid().optional(),
});

export const GET = route({
  access: { kind: "permission", require: ["READ_APPLICATIONS"] },
  rateLimit: RATE_LIMITS.partnerRead,
  query: listQuery,
  handler: async ({ query }) => {
    const items = await db.application.findMany({
      where: {
        ...(query.status ? { status: query.status as never } : {}),
        ...(query.universityId ? { universityId: query.universityId } : {}),
        ...(query.partnerId ? { partnerId: query.partnerId } : {}),
        ...(query.representativeId ? { representativeId: query.representativeId } : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      select: APPLICATION_FIELDS,
    });

    const hasMore = items.length > query.limit;
    const page = hasMore ? items.slice(0, query.limit) : items;
    return { items: page, nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null };
  },
});
