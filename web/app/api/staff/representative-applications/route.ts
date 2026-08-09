/**
 * GET /api/staff/representative-applications — the review queue
 *
 * Auth:  required (staff session)
 * Authz: READ_REPRESENTATIVES. Any staff member may read the queue; only an admin
 *        may decide on it, which is the `/[id]/decision` endpoint's rule.
 *
 *   200  { items, nextCursor }
 *   401  no session
 *   403  lacks the permission
 *   429  rate limited
 *
 * First endpoint written against the permission layer rather than the role list. The
 * difference: this states what the caller must be able to do, so moving the grant
 * between roles happens in `permissions.ts` alone.
 */

import { route } from "@/server/http/handler";
import { db } from "@/server/lib/db";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { listRepresentativeApplicationsQuery } from "@/server/modules/representatives/representatives.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({
  access: { kind: "permission", require: ["READ_REPRESENTATIVES"] },
  rateLimit: RATE_LIMITS.partnerRead,
  query: listRepresentativeApplicationsQuery,
  handler: async ({ query }) => {
    const items = await db.representativeApplication.findMany({
      where: query.status ? { status: query.status } : {},
      // Oldest decision first within a status, newest overall: the queue is worked from
      // the top, and somebody has been waiting for each of these.
      orderBy: { createdAt: "desc" },
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        fullName: true,
        organizationName: true,
        country: true,
        territory: true,
        email: true,
        phone: true,
        message: true,
        status: true,
        reviewNote: true,
        reviewedAt: true,
        createdAt: true,
        reviewedBy: { select: { name: true, email: true } },
      },
    });

    // One more than asked for, then trimmed: that is how the cursor knows whether
    // another page exists without a second count query.
    const hasMore = items.length > query.limit;
    const page = hasMore ? items.slice(0, query.limit) : items;

    return {
      items: page,
      nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
    };
  },
});
