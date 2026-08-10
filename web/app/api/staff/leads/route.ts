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
 *   - MEDICAL enquiries carry health information. Their payload is returned only to a
 *     caller who asks for that kind explicitly, so a general sweep of the inbox does
 *     not spray special-category data across a screen that did not need it.
 *
 * Since 0011 a lead is a person and an inquiry is a message, so a row here is one person
 * with their most recent message attached. `inquiryCount` is what tells the desk this is
 * somebody who has written in before.
 */

import { route } from "@/server/http/handler";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { db } from "@/server/lib/db";
import { leadQueueQuery } from "@/server/modules/staff/staff.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** What a caller sees instead of a medical payload they did not ask for. */
const WITHHELD = { withheld: "Open the medical queue to view this enquiry." } as const;

export const GET = route({
  access: { kind: "permission", require: ["READ_LEADS"] },
  rateLimit: RATE_LIMITS.partnerRead,
  query: leadQueueQuery,
  handler: async ({ query, log }) => {
    const rows = await db.lead.findMany({
      where: {
        /**
         * Filtered on the *message's* type, not the person's.
         *
         * `lead.kind` is what they first wrote in about and never changes. Filtering on
         * it hid a whole class of enquiry: someone who asked about sourcing in March and
         * a medical procedure in September is a BUSINESS lead, so `?kind=MEDICAL` did not
         * return them — while the general sweep withheld the same message for being
         * medical. The enquiry was unreachable from either direction, and the person got
         * no reply.
         */
        ...(query.kind ? { inquiries: { some: { type: query.kind } } } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      select: {
        id: true, kind: true, email: true, status: true,
        name: true, phone: true, country: true, serviceInterest: true,
        consentAt: true, retentionUntil: true, createdAt: true,
        assignedToUserId: true,
        _count: { select: { inquiries: true } },
        /**
         * One message per row: the newest of the type asked for, or simply the newest.
         *
         * Scoping it to the filter is what makes the queue coherent — the medical queue
         * has to show the medical enquiry, not whatever that person happened to send
         * most recently. Fetching every inquiry instead would make this list unbounded
         * in a way the page size no longer controls: one prolific enquirer would return
         * fifty payloads inside a page of twenty leads.
         */
        inquiries: {
          ...(query.kind ? { where: { type: query.kind } } : {}),
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true, type: true, subject: true, message: true, payload: true,
            status: true, createdAt: true, retentionUntil: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const page = rows.slice(0, query.limit);

    const items = page.map(({ _count, inquiries, ...lead }) => {
      const latest = inquiries[0] ?? null;

      // Health data is returned only when it was asked for by name. Both the structured
      // payload and the free-text body are withheld — the body is where a medical
      // enquiry actually describes the condition.
      const redact = latest?.type === "MEDICAL" && query.kind !== "MEDICAL";

      return {
        ...lead,
        inquiryCount: _count.inquiries,
        latest: latest
          ? redact
            ? { ...latest, payload: WITHHELD, message: null, subject: null }
            : latest
          : null,
      };
    });

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
