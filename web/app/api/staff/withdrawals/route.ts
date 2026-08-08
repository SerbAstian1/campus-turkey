/**
 * GET /api/staff/withdrawals — the approval queue
 *
 * Auth:  required (staff session)
 * Authz: SUPPORT, FINANCE or ADMIN. Support can read the queue; only FINANCE and ADMIN
 *        can act on it, which the transition endpoint enforces separately.
 *
 *   200  { items: [...], nextCursor }
 *   400  invalid status, partnerId or cursor
 *   401  no session
 *   403  not a staff account, or the wrong role
 *   429  rate limited
 *
 * Deliberately not scoped to one partner: this is the whole business's queue, which is
 * the point of a console. Every other list endpoint in this codebase is scoped to the
 * caller's own partner, so the asymmetry is worth naming — it is safe only because the
 * role check above is what stands between a partner and everyone else's payouts.
 */

import { route } from "@/server/http/handler";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { db } from "@/server/lib/db";
import { withdrawalQueueQuery } from "@/server/modules/staff/staff.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({
  access: { kind: "staff", roles: ["SUPPORT", "FINANCE", "ADMIN"] },
  rateLimit: RATE_LIMITS.partnerRead,
  query: withdrawalQueueQuery,
  handler: async ({ query }) => {
    const rows = await db.withdrawal.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.partnerId ? { partnerId: query.partnerId } : {}),
      },
      select: {
        id: true, reference: true, amountMinor: true, currency: true, status: true,
        period: true, basis: true, requestedAt: true, providerRef: true,
        partner: { select: { id: true, org: true, person: true, territory: true } },
        payoutMethod: { select: { kind: true, label: true, maskedDetail: true } },
        // The audit trail, newest last, so a reviewer can see how it got here.
        events: {
          select: { fromStatus: true, toStatus: true, note: true, at: true,
            actor: { select: { name: true, email: true } } },
          orderBy: { at: "asc" },
        },
      },
      // Oldest first: this is a work queue, and the partner who has waited longest
      // should be at the top of it.
      orderBy: [{ requestedAt: "asc" }, { id: "asc" }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const items = rows.slice(0, query.limit);
    return {
      items,
      nextCursor: rows.length > query.limit ? (items[items.length - 1]?.id ?? null) : null,
    };
  },
});
