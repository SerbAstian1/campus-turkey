/**
 * POST /api/staff/leads/:id/approve-student — turn a direct study enquiry into a student
 * account
 *
 * Auth:  required (staff session)
 * Authz: **ADMIN only** — the same reasoning as `/approve` for partners: this creates a
 *        new principal (a login), not just a routine update, and who may bring a new
 *        party into the system is stricter than who may work an enquiry.
 *
 *   200  { studentId, userId, email, welcomeSent }
 *   400  validation failed, or `id` is not a uuid
 *   404  no such enquiry
 *   409  already approved, or that email already has an account
 *   422  the enquiry is not a study enquiry, is missing required fields, or the
 *        direct-applicant house account has not been set up (see
 *        scripts/create-house-partner.mjs)
 *   429  rate limited
 *
 * No password is set or sent by staff. A registration-time credential is activated;
 * older queued enquiries receive the password-setup link.
 */

import { z } from "zod";
import { route } from "@/server/http/handler";
import { requireUser } from "@/server/http/session";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { ValidationError } from "@/server/lib/errors";
import { approveStudentApplication } from "@/server/modules/onboarding/student-onboarding.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const idParam = z.string().uuid();

const approveBody = z.object({
  universityName: z.string().trim().min(2).max(200),
  program: z.string().trim().max(200).optional(),
  country: z.string().trim().min(2).max(80).optional(),
});

export const POST = route({
  access: { kind: "permission", require: ["APPROVE_STUDENT_APPLICATION"] },
  rateLimit: RATE_LIMITS.partnerWrite,
  body: approveBody,
  handler: async ({ body, params, session, log }) => {
    const user = requireUser(session);

    const parsed = idParam.safeParse(params["id"]);
    if (!parsed.success) {
      throw new ValidationError({ id: ["That is not a valid enquiry."] });
    }

    return approveStudentApplication(
      {
        leadId: parsed.data,
        universityName: body.universityName,
        ...(body.program ? { program: body.program } : {}),
        ...(body.country ? { country: body.country } : {}),
      },
      { id: user.id },
      log,
    );
  },
});
