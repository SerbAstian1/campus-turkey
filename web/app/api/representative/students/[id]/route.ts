/** Maintain a student referred by the signed-in representative. */

import { z } from "zod";
import { route } from "@/server/http/handler";
import { requireRepresentative } from "@/server/http/session";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/server/lib/errors";
import { db } from "@/server/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const idParam = z.string().uuid();
const updateBody = z.object({
  name: z.string().trim().min(2, "Enter the student's full name.").max(120).optional(),
  universityName: z.string().trim().min(1, "Enter the university.").max(200).optional(),
  program: z.string().trim().min(1, "Enter the programme.").max(200).optional(),
}).refine((body) => Object.values(body).some((value) => value !== undefined), {
  message: "Choose something to update.",
});

function parseId(value: string | undefined): string {
  const parsed = idParam.safeParse(value);
  if (!parsed.success) throw new ValidationError({ id: ["That is not a valid student."] });
  return parsed.data;
}

function assertActive(status: string): void {
  if (status !== "ACTIVE") throw new ForbiddenError("This account cannot change students at the moment.");
}

export const PATCH = route({
  access: { kind: "permission", require: ["REPRESENTATIVE_CREATE_STUDENT_REFERRAL"] },
  rateLimit: RATE_LIMITS.partnerWrite,
  body: updateBody,
  handler: async ({ body, params, session, log }) => {
    const representative = requireRepresentative(session);
    assertActive(representative.status);
    const id = parseId(params["id"]);

    const existing = await db.student.findFirst({
      where: { id, representativeId: representative.id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundError("We could not find that student.");

    const student = await db.student.update({
      where: { id },
      data: {
        ...body,
        ...(body.universityName
          ? { universitySlug: body.universityName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") }
          : {}),
      },
      select: { id: true, name: true, universityName: true, program: true, stage: true, updatedAt: true },
    });

    log.audit("representative.student_updated", {
      representativeId: representative.id, studentId: id, fields: Object.keys(body),
    });
    return student;
  },
});

export const DELETE = route({
  access: { kind: "permission", require: ["REPRESENTATIVE_CREATE_STUDENT_REFERRAL"] },
  rateLimit: RATE_LIMITS.partnerWrite,
  handler: async ({ params, session, log }) => {
    const representative = requireRepresentative(session);
    assertActive(representative.status);
    const id = parseId(params["id"]);

    const student = await db.student.findFirst({
      where: { id, representativeId: representative.id },
      select: {
        id: true, stage: true, profileId: true,
        _count: { select: { applications: true, commissions: true } },
      },
    });
    if (!student) throw new NotFoundError("We could not find that student.");
    if (student.stage !== "ENQUIRY" || student.profileId || student._count.applications || student._count.commissions) {
      throw new ConflictError(
        "student_has_history",
        "This student already has account or application history and cannot be deleted.",
      );
    }

    const deleted = await db.student.deleteMany({
      where: {
        id, representativeId: representative.id, stage: "ENQUIRY", profileId: null,
        applications: { none: {} }, commissions: { none: {} },
      },
    });
    if (deleted.count !== 1) {
      throw new ConflictError("student_changed", "This student changed while you were editing it. Reload and try again.");
    }

    log.audit("representative.student_deleted", { representativeId: representative.id, studentId: id });
    return { deleted: true };
  },
});
