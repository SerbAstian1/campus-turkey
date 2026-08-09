/**
 * POST /api/student/claim — join a referred record to this account
 *
 * Auth:  required (signed-in student)
 * Authz: CLAIM_STUDENT_RECORD
 *
 *   200  { studentId, studentName }
 *   400  validation failed
 *   401  no session
 *   403  not a student
 *   422  the code is not valid
 *   429  rate limited
 *
 * The single act that changes who owns an application, which is why it is rate-limited
 * on the write policy rather than the read one and why an invalid code and a consumed
 * code give the same answer. Distinguishing them tells somebody guessing that they were
 * once close.
 */

import { z } from "zod";
import { route } from "@/server/http/handler";
import { requireUser } from "@/server/http/session";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { claimStudentRecord } from "@/server/modules/claiming/claiming.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const body = z.object({
  // Eight characters from an unambiguous alphabet. Case is normalised in the service,
  // because this is typed off a screen by somebody who may be doing it in a third
  // language.
  claimCode: z.string().trim().min(6).max(16),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  nationality: z.string().trim().min(2).max(80),
  countryOfResidence: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(6).max(32).optional(),
});

export const POST = route({
  access: { kind: "permission", require: ["CLAIM_STUDENT_RECORD"] },
  rateLimit: RATE_LIMITS.partnerWrite,
  body,
  handler: async ({ body, session, log }) => {
    const user = requireUser(session);
    const claimed = await claimStudentRecord({ ...body, userId: user.id }, log);
    return { studentId: claimed.studentId, studentName: claimed.studentName };
  },
});
