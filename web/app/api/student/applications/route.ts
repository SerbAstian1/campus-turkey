/** POST /api/student/applications — start a draft for the signed-in student. */

import { route } from "@/server/http/handler";
import { requireUser } from "@/server/http/session";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { db } from "@/server/lib/db";
import { ForbiddenError } from "@/server/lib/errors";
import { createApplication } from "@/server/modules/applications/applications.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route({
  access: { kind: "permission", require: ["CREATE_APPLICATION"] },
  rateLimit: RATE_LIMITS.partnerWrite,
  handler: async ({ session, log }) => {
    const user = requireUser(session);

    // Ownership comes only from the session. No student id is accepted from the browser.
    const student = await db.student.findFirst({
      where: { profile: { userId: user.id } },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (!student) throw new ForbiddenError("Claim your student record first.");

    // Treat a repeat click/retry as success instead of creating duplicate blank drafts.
    const existing = await db.application.findFirst({
      where: { studentId: student.id, status: "DRAFT" },
      orderBy: { updatedAt: "desc" },
      select: { id: true, applicationNumber: true },
    });
    if (existing) return { application: existing, created: false };

    const application = await createApplication({ studentId: student.id }, log);
    return { application, created: true };
  },
});
