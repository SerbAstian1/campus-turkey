/** DELETE /api/student/applications/:id — remove the caller's own untouched draft. */

import { z } from "zod";
import { route } from "@/server/http/handler";
import { requireUser } from "@/server/http/session";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/server/lib/errors";
import { db } from "@/server/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const idParam = z.string().uuid();

export const DELETE = route({
  access: { kind: "permission", require: ["READ_OWN_APPLICATIONS"] },
  rateLimit: RATE_LIMITS.partnerWrite,
  handler: async ({ params, session, log }) => {
    const user = requireUser(session);
    const parsed = idParam.safeParse(params["id"]);
    if (!parsed.success) throw new ValidationError({ id: ["That is not a valid application."] });

    const profile = await db.studentProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!profile) throw new ForbiddenError("Claim your student record first.");

    const application = await db.application.findFirst({
      where: { id: parsed.data, student: { profileId: profile.id } },
      select: { id: true, status: true },
    });
    if (!application) throw new NotFoundError("We could not find that application.");
    if (application.status !== "DRAFT") {
      throw new ConflictError("application_already_submitted", "Only an application that has not been submitted can be deleted.");
    }

    const deleted = await db.application.deleteMany({
      where: { id: application.id, status: "DRAFT", student: { profileId: profile.id } },
    });
    if (deleted.count !== 1) {
      throw new ConflictError("application_changed", "This application changed while you were editing it. Reload and try again.");
    }

    log.audit("student.application_draft_deleted", { applicationId: application.id, actorUserId: user.id });
    return { deleted: true };
  },
});
