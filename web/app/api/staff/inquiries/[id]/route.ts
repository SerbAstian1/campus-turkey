/**
 * PATCH /api/staff/inquiries/:id — mark one message answered or closed
 *
 * Auth:  required (staff session)
 * Authz: READ_LEADS, for the same reason as the lead endpoint: answering enquiries is
 *        the work of the desk that reads them.
 *
 *   200  the updated inquiry
 *   400  validation failed, or `id` is not a uuid
 *   404  no such inquiry
 *   429  rate limited
 *
 * Separate from the lead endpoint because they answer different questions. A *lead's*
 * status is about the person — are we still talking to them. An *inquiry's* status is
 * about one message — has this one been answered. Somebody who wrote three times can
 * have two answered and one open, and a single status could not say so.
 *
 * `ANSWERED` records who answered and when, together, because the CHECK constraint
 * requires both — see `inquiry_responded_has_handler`. The responder is always the
 * caller: recording somebody else's name for work you did is not a feature.
 */

import { z } from "zod";
import { route } from "@/server/http/handler";
import { requireUser } from "@/server/http/session";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { NotFoundError, ValidationError } from "@/server/lib/errors";
import { db } from "@/server/lib/db";
import { updateInquiryBody } from "@/server/modules/staff/staff.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const idParam = z.string().uuid();

export const PATCH = route({
  access: { kind: "permission", require: ["READ_LEADS"] },
  rateLimit: RATE_LIMITS.partnerWrite,
  body: updateInquiryBody,
  handler: async ({ body, params, session, log }) => {
    const user = requireUser(session);

    const parsed = idParam.safeParse(params["id"]);
    if (!parsed.success) {
      throw new ValidationError({ id: ["That is not a valid enquiry."] });
    }

    const existing = await db.inquiry.findUnique({
      where: { id: parsed.data },
      select: { id: true, type: true, status: true, respondedAt: true },
    });
    if (!existing) throw new NotFoundError("We could not find that enquiry.");

    /**
     * Answering stamps the responder; anything else clears the stamp, because the
     * constraint refuses a responder without a response time and vice versa. Reopening
     * an answered enquiry that keeps its old responder would credit them with an answer
     * the enquirer evidently did not get.
     */
    const answered = body.status === "ANSWERED";

    const inquiry = await db.inquiry.update({
      where: { id: parsed.data },
      data: answered
        ? { status: "ANSWERED", respondedAt: existing.respondedAt ?? new Date(), handledByUserId: user.id }
        : { status: body.status, respondedAt: null, handledByUserId: null },
      select: { id: true, leadId: true, type: true, status: true, respondedAt: true, updatedAt: true },
    });

    // The type is recorded but never the message: a MEDICAL enquiry's body is health
    // data, and an audit log is the last place it should end up.
    log.audit("inquiry.updated", {
      inquiryId: inquiry.id,
      type: inquiry.type,
      from: existing.status,
      to: body.status,
      actorUserId: user.id,
    });

    return inquiry;
  },
});
