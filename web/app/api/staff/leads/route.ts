/**
 * GET /api/staff/leads — the enquiry inbox
 *
 * Auth:  required (staff session)
 * Authz: SUPPORT, FINANCE or ADMIN.
 *
 *   200  { items, nextCursor }
 *   400  invalid kind, status or cursor
 *   401 / 403 / 429  as elsewhere
 *
 * Every public form posts into this table, and until now nothing could read it — a
 * contact form whose messages nobody can retrieve is the same as one that drops them.
 *
 * Two deliberate restrictions on what comes back:
 *
 *   - `ipPrefix` is never selected. It exists to investigate abuse, not to sit in a
 *     list view, and a truncated IP beside a name is still a location hint.
 *   - MEDICAL leads carry health information. Their payload is returned only to a
 *     caller who asks for that kind explicitly, so a general sweep of the inbox does
 *     not spray special-category data across a screen that did not need it.
 */

import { route } from "@/server/http/handler";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { db } from "@/server/lib/db";
import { leadQueueQuery } from "@/server/modules/staff/staff.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({
  access: { kind: "staff", roles: ["SUPPORT", "FINANCE", "ADMIN"] },
  rateLimit: RATE_LIMITS.partnerRead,
  query: leadQueueQuery,
  handler: async ({ query, log }) => {
    const rows = await db.lead.findMany({
      where: {
        ...(query.kind ? { kind: query.kind } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      select: {
        id: true, kind: true, email: true, status: true,
        consentAt: true, retentionUntil: true, createdAt: true,
        payload: true,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const page = rows.slice(0, query.limit);

    // Health data is returned only when it was asked for by name.
    const items = page.map((lead) =>
      lead.kind === "MEDICAL" && query.kind !== "MEDICAL"
        ? { ...lead, payload: { withheld: "Open the medical queue to view this enquiry." } }
        : lead,
    );

    if (query.kind === "MEDICAL") {
      // Access to special-category data is itself worth recording.
      log.audit("leads.medical_viewed", { count: items.length });
    }

    return {
      items,
      nextCursor: rows.length > query.limit ? (page[page.length - 1]?.id ?? null) : null,
    };
  },
});
