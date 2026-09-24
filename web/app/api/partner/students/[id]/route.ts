/**
 * PATCH/DELETE /api/partner/students/:id — maintain one student owned by this partner.
 *
 * The partner id always comes from the session. Deletion is intentionally limited to
 * untouched enquiry records: workflow, account, and financial history are records, not
 * disposable list items.
 */

import { z } from "zod";
import { route } from "@/server/http/handler";
import { requirePartner } from "@/server/http/session";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/server/lib/errors";
import { db } from "@/server/lib/db";
import { toStudentDto } from "@/server/types/api";

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
  access: { kind: "partner" },
  rateLimit: RATE_LIMITS.partnerWrite,
  body: updateBody,
  handler: async ({ body, params, session, log }) => {
    const partner = requirePartner(session);
    assertActive(partner.status);
    const id = parseId(params["id"]);

    const existing = await db.student.findFirst({
      where: { id, partnerId: partner.id },
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
      select: {
        id: true, name: true, universityName: true, program: true, stage: true, updatedAt: true,
        commissions: { where: { state: "CONFIRMED" }, select: { amountMinor: true } },
      },
    });

    log.audit("partner.student_updated", { partnerId: partner.id, studentId: id, fields: Object.keys(body) });
    return toStudentDto({
      ...student,
      commissionMinor: student.commissions.reduce((total, commission) => total + commission.amountMinor, 0),
    });
  },
});

export const DELETE = route({
  access: { kind: "partner" },
  rateLimit: RATE_LIMITS.partnerWrite,
  handler: async ({ params, session, log }) => {
    const partner = requirePartner(session);
    assertActive(partner.status);
    const id = parseId(params["id"]);

    const student = await db.student.findFirst({
      where: { id, partnerId: partner.id },
      select: {
        id: true, stage: true, profileId: true,
        _count: { select: { applications: true, commissions: true } },
      },
    });
    if (!student) throw new NotFoundError("We could not find that student.");
    if (student.stage !== "ENQUIRY" || student.profileId || student._count.applications || student._count.commissions) {
      throw new ConflictError(
        "student_has_history",
        "This student already has account, application, or commission history and cannot be deleted.",
      );
    }

    const deleted = await db.student.deleteMany({
      where: {
        id, partnerId: partner.id, stage: "ENQUIRY", profileId: null,
        applications: { none: {} }, commissions: { none: {} },
      },
    });
    if (deleted.count !== 1) {
      throw new ConflictError("student_changed", "This student changed while you were editing it. Reload and try again.");
    }

    log.audit("partner.student_deleted", { partnerId: partner.id, studentId: id });
    return { deleted: true };
  },
});
