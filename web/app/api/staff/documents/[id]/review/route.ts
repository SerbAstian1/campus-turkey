/**
 * POST /api/staff/documents/:id/review — approve, reject, or ask for a replacement
 *
 * Auth:  required (staff session)
 * Authz: REVIEW_DOCUMENTS
 *
 *   200  the updated document
 *   400  validation failed, or `id` is not a uuid
 *   401  no session
 *   403  lacks the permission
 *   404  no such document
 *   422  the upload never finished, or a refusal arrived with no reason
 *   429  rate limited
 *
 * A refusal must say why, enforced here, in the service, and again by a database
 * constraint. The reason is the only thing the applicant is shown; a refusal without one
 * leaves them holding a rejected document and nothing to act on, which generates a phone
 * call at best and a lost applicant at worst.
 */

import { z } from "zod";
import { route } from "@/server/http/handler";
import { requireUser } from "@/server/http/session";
import { ValidationError } from "@/server/lib/errors";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { reviewDocument } from "@/server/modules/documents/documents.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const idParam = z.string().uuid();

/**
 * A discriminated union rather than a status plus an optional reason.
 *
 * The type system carries the rule this way: there is no shape in which a rejection lacks
 * a reason, so a caller cannot construct one and no runtime check has to catch it.
 */
const body = z.discriminatedUnion("status", [
  z.object({ status: z.literal("APPROVED") }),
  z.object({
    status: z.literal("REJECTED"),
    reason: z.string().trim().min(1, "Say what is wrong with it.").max(500),
  }),
  z.object({
    status: z.literal("REQUIRES_REUPLOAD"),
    reason: z.string().trim().min(1, "Say what is wrong with it.").max(500),
  }),
]);

export const POST = route({
  access: { kind: "permission", require: ["REVIEW_DOCUMENTS"] },
  rateLimit: RATE_LIMITS.partnerWrite,
  body,
  handler: async ({ body, params, session, log }) => {
    const user = requireUser(session);

    const parsed = idParam.safeParse(params["id"]);
    if (!parsed.success) throw new ValidationError({ id: ["That is not a valid document."] });

    return reviewDocument(
      {
        documentId: parsed.data,
        status: body.status,
        ...("reason" in body ? { reason: body.reason } : {}),
      },
      { userId: user.id },
      log,
    );
  },
});
