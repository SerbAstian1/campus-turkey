/**
 * DELETE /api/staff/representative-applications/:id — remove an intake item.
 *
 * The locked registration credential is removed when no other live application needs
 * it, allowing the address to apply again cleanly. If the application was approved,
 * its login is retired and its historical profile is closed, freeing the original
 * address without breaking records that refer to that profile.
 */

import { z } from "zod";
import { route } from "@/server/http/handler";
import { requireUser } from "@/server/http/session";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { ConflictError, NotFoundError, ValidationError } from "@/server/lib/errors";
import { db } from "@/server/lib/db";
import { recordAudit } from "@/server/modules/audit/audit.service";
import { retirePublicAccount } from "@/server/modules/onboarding/account-retirement";

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
        where: { id: application.id },
      });
      if (deletedApplication.count !== 1) {
        throw new ConflictError(
          "application_changed",
          "This application changed while you were deleting it. Reload and try again.",
        );
      }

      let pendingAccountRemoved = false;
      let activeAccountRetired = false;
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
      } else if (
        pendingUser &&
        application.status === "APPROVED" &&
        pendingUser.role === "REPRESENTATIVE"
      ) {
        await retirePublicAccount(tx, pendingUser.id);
        activeAccountRetired = true;
      }

      await recordAudit({
        action: "representative_application.deleted",
        entityType: "representative_application",
        entityId: application.id,
        actorUserId: actor.id,
        metadata: {
          previousStatus: application.status,
          activeAccountRetired,
          pendingAccountRemoved,
        },
      }, tx);

      return { id: application.id, pendingAccountRemoved, activeAccountRetired };
    });

    log.audit("representative_application.deleted", {
      applicationId: result.id,
      actorUserId: actor.id,
      pendingAccountRemoved: result.pendingAccountRemoved,
      activeAccountRetired: result.activeAccountRetired,
    });
    return { deleted: true };
  },
});
