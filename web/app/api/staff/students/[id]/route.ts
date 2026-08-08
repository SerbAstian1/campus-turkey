/**
 * PATCH /api/staff/students/:id — move a student through the pipeline
 *
 * Auth:  required (staff session)
 * Authz: SUPPORT, FINANCE or ADMIN. Advancing a stage does not move money, so support
 *        can do it — this is the ordinary daily work of the admissions desk.
 *
 *   200  the updated student
 *   400  validation failed, or `id` is not a uuid
 *   404  no such student
 *   429  rate limited
 *
 * Reaching REGISTERED does **not** create or confirm a commission. That is deliberate:
 * money becoming withdrawable is a separate, attributed decision made through
 * `/api/staff/commissions`. Coupling the two would mean a mis-clicked dropdown pays
 * somebody, and it would answer the client's open question about what confirms a
 * registration by accident rather than on purpose.
 */

import { z } from "zod";
import { route } from "@/server/http/handler";
import { requireUser } from "@/server/http/session";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { NotFoundError, ValidationError } from "@/server/lib/errors";
import { db } from "@/server/lib/db";
import { updateStudentBody } from "@/server/modules/staff/staff.schema";
import { toStudentDto } from "@/server/types/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const idParam = z.string().uuid();

export const PATCH = route({
  access: { kind: "staff", roles: ["SUPPORT", "FINANCE", "ADMIN"] },
  rateLimit: RATE_LIMITS.partnerWrite,
  body: updateStudentBody,
  handler: async ({ body, params, session, log }) => {
    const user = requireUser(session);

    const parsed = idParam.safeParse(params["id"]);
    if (!parsed.success) {
      throw new ValidationError({ id: ["That is not a valid student."] });
    }

    const existing = await db.student.findUnique({
      where: { id: parsed.data },
      select: { id: true, stage: true, partnerId: true },
    });
    if (!existing) throw new NotFoundError("We could not find that student.");

    const student = await db.student.update({
      where: { id: parsed.data },
      data: { stage: body.stage },
      select: {
        id: true, name: true, universityName: true, program: true,
        stage: true, updatedAt: true,
        commissions: { where: { state: "CONFIRMED" }, select: { amountMinor: true } },
      },
    });

    log.audit("student.stage_changed", {
      studentId: student.id,
      partnerId: existing.partnerId,
      from: existing.stage,
      to: body.stage,
      actorUserId: user.id,
    });

    return toStudentDto({
      id: student.id,
      name: student.name,
      universityName: student.universityName,
      program: student.program,
      stage: student.stage,
      updatedAt: student.updatedAt,
      commissionMinor: student.commissions.reduce((total, c) => total + c.amountMinor, 0),
    });
  },
});
