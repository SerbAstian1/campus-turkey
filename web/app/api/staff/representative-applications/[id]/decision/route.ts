/**
 * POST /api/staff/representative-applications/:id/decision — approve or reject
 *
 * Auth:  required (staff session)
 * Authz: APPROVE_REPRESENTATIVE_APPLICATION. Admin only — approving creates a new
 *        principal, and who may bring a party into the system is a narrower question
 *        than who may process one already in it.
 *
 *   200  { representativeId, userId, email, welcomeSent } on approval, { ok: true } on rejection
 *   400  validation failed, or `id` is not a uuid
 *   401  no session
 *   403  lacks the permission
 *   404  no such application
 *   409  already decided, or that email already has an account
 *   422  previously rejected
 *   429  rate limited
 *
 * One endpoint for both outcomes rather than two, because they are the same decision
 * and a reviewer picks one. Two endpoints would let a caller approve something the
 * interface only offered to reject.
 *
 * No password is set or sent. The representative chooses their own at
 * `/portal/set-password`, the same flow partners use.
 */

import { z } from "zod";
import { route } from "@/server/http/handler";
import { requireUser } from "@/server/http/session";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { ValidationError } from "@/server/lib/errors";
import {
  approveRepresentativeApplication,
  rejectRepresentativeApplication,
} from "@/server/modules/representatives/representatives.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const idParam = z.string().uuid();

/**
 * A discriminated union rather than an optional `note`, so the type system carries the
 * rule that a rejection must say why. The alternative — one shape with an optional note
 * checked at runtime — puts the rule somewhere a caller can miss it.
 */
const decisionBody = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("APPROVE"),
    territory: z.string().trim().max(120).optional(),
  }),
  z.object({
    decision: z.literal("REJECT"),
    note: z.string().trim().min(1, "Say why, so the decision can be explained later.").max(1000),
  }),
]);

export const POST = route({
  access: { kind: "permission", require: ["APPROVE_REPRESENTATIVE_APPLICATION"] },
  rateLimit: RATE_LIMITS.partnerWrite,
  body: decisionBody,
  handler: async ({ body, params, session, log }) => {
    const user = requireUser(session);

    const parsed = idParam.safeParse(params["id"]);
    if (!parsed.success) {
      throw new ValidationError({ id: ["That is not a valid application."] });
    }

    if (body.decision === "REJECT") {
      await rejectRepresentativeApplication(
        { applicationId: parsed.data, note: body.note },
        { id: user.id },
        log,
      );
      return { ok: true };
    }

    return approveRepresentativeApplication(
      {
        applicationId: parsed.data,
        ...(body.territory ? { territory: body.territory } : {}),
      },
      { id: user.id },
      log,
    );
  },
});
