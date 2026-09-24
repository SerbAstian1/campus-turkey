/**
 * DELETE /api/staff/representative-applications/:id — remove an unapproved intake item.
 *
 * Approved applications are the admission record behind a live account and remain
 * immutable here. Pending and rejected applications may be removed by staff; the
 * locked registration credential is also removed when no other live application needs
 * it, allowing the address to apply again cleanly.
 */

import { z } from "zod";
import { route } from "@/server/http/handler";
import { requireUser } from "@/server/http/session";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { ConflictError, NotFoundError, ValidationError } from "@/server/lib/errors";
import { db } from "@/server/lib/db";
import { recordAudit } from "@/server/modules/audit/audit.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const idParam = z.string().uuid();

export const DELETE = route({
  access: { kind: "permission", require: ["DELETE_REPRESENTATIVE_APPLICATIONS"] },
  rateLimit: RATE_LIMITS.partnerWrite,
  handler: async ({ params, session, log }) => {
    const actor = requireUser(session);
    const parsed = idParam.safeParse(params["id"]);
    if (!parsed.success) {
      throw new ValidationError({ id: ["That is not a valid application."] });
    }

    const result = await db.$transaction(async (tx) => {
      const application = await tx.representativeApplication.findUnique({
        where: { id: parsed.data },
        select: { id: true, email: true, status: true },
      });
      if (!application) throw new NotFoundError("We could not find that application.");
      if (application.status === "APPROVED") {
        throw new ConflictError(
          "application_approved",
          "This application created an account and cannot be deleted here.",
        );
      }

      const [pendingUser, otherLiveApplications] = await Promise.all([
        tx.user.findUnique({
          where: { email: application.email },
          select: {
            id: true, status: true, role: true,
            accounts: { select: { providerId: true, password: true } },
            representative: { select: { id: true } },
          },
        }),
        tx.representativeApplication.count({
          where: {
            id: { not: application.id },
            email: application.email,
            status: { in: ["PENDING", "UNDER_REVIEW"] },
          },
        }),
      ]);

      const removablePendingUser = Boolean(
        pendingUser &&
        pendingUser.status === "PENDING" &&
        pendingUser.role === "REPRESENTATIVE" &&
        pendingUser.accounts.some((account) => account.providerId === "credential" && Boolean(account.password)) &&
        !pendingUser.representative &&
        otherLiveApplications === 0,
      );

      const deletedApplication = await tx.representativeApplication.deleteMany({
        where: { id: application.id, status: { not: "APPROVED" } },
      });
      if (deletedApplication.count !== 1) {
        throw new ConflictError(
          "application_approved",
          "This application was approved while you were deleting it. The account was not changed.",
        );
      }

      let pendingAccountRemoved = false;
      if (pendingUser && removablePendingUser) {
        const deletedUser = await tx.user.deleteMany({
          where: {
            id: pendingUser.id,
            status: "PENDING",
            role: "REPRESENTATIVE",
            representative: null,
          },
        });
        pendingAccountRemoved = deletedUser.count === 1;
      }

      await recordAudit({
        action: "representative_application.deleted",
        entityType: "representative_application",
        entityId: application.id,
        actorUserId: actor.id,
        metadata: {
          previousStatus: application.status,
          pendingAccountRemoved,
        },
      }, tx);

      return { id: application.id, pendingAccountRemoved };
    });

    log.audit("representative_application.deleted", {
      applicationId: result.id,
      actorUserId: actor.id,
      pendingAccountRemoved: result.pendingAccountRemoved,
    });
    return { deleted: true };
  },
});
