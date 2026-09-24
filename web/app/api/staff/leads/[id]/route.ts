/**
 * PATCH /api/staff/leads/:id — work an enquiry
 *
 * Auth:  required (staff session)
 * Authz: READ_LEADS. Marking an enquiry contacted or handing it to a colleague is the
 *        ordinary daily work of the desk that reads the inbox, and gating it behind a
 *        second permission would mean the people who answer enquiries cannot record
 *        that they answered them.
 *
 *   200  the updated lead
 *   400  validation failed, or `id` is not a uuid
 *   404  no such lead, or the named assignee is not staff
 *   429  rate limited
 *
 * Both fields are optional and at least one is required, so a caller can reassign
 * without restating the status and vice versa. Sending neither is a 400 rather than a
 * silent no-op: a request that changes nothing is a bug in the caller, and answering
 * 200 to it hides that.
 *
 * `CONVERTED` is not settable here. A lead becomes converted by an approval creating an
 * account — `approvePartnerApplication` sets it and the user id together — and allowing
 * it to be typed in by hand would produce leads marked converted with no account behind
 * them, which is the state the conversion link exists to make impossible.
 */

import { z } from "zod";
import { route } from "@/server/http/handler";
import { requireUser } from "@/server/http/session";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { ConflictError, NotFoundError, UnprocessableError, ValidationError } from "@/server/lib/errors";
import { db } from "@/server/lib/db";
import { updateLeadBody } from "@/server/modules/staff/staff.schema";
import { recordAudit } from "@/server/modules/audit/audit.service";
import { retirePublicAccount } from "@/server/modules/onboarding/account-retirement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const idParam = z.string().uuid();

export const PATCH = route({
  access: { kind: "permission", require: ["READ_LEADS"] },
  rateLimit: RATE_LIMITS.partnerWrite,
  body: updateLeadBody,
  handler: async ({ body, params, session, log }) => {
    const user = requireUser(session);

    const parsed = idParam.safeParse(params["id"]);
    if (!parsed.success) {
      throw new ValidationError({ id: ["That is not a valid enquiry."] });
    }

    const existing = await db.lead.findUnique({
      where: { id: parsed.data },
      select: { id: true, status: true, assignedToUserId: true },
    });
    if (!existing) throw new NotFoundError("We could not find that enquiry.");

    if (existing.status === "CONVERTED") {
      throw new UnprocessableError(
        "lead_converted",
        "This enquiry has already become an account. Work with the account instead.",
      );
    }

    /**
     * An assignee must be staff.
     *
     * Without this a lead could be assigned to a partner — whose portal has no inbox, so
     * the enquiry would sit in a queue nobody can open while appearing to be somebody's
     * job. The uuid passing validation is not the same as it naming someone who can act.
     */
    if (body.assignedToUserId) {
      const assignee = await db.user.findUnique({
        where: { id: body.assignedToUserId },
        select: { role: true, status: true },
      });
      const isStaff =
        assignee && ["STAFF", "ADMIN", "SUPER_ADMIN"].includes(assignee.role) && assignee.status === "ACTIVE";

      if (!isStaff) {
        throw new NotFoundError("We could not find that colleague, or their account is not active.");
      }
    }

    const lead = await db.lead.update({
      where: { id: parsed.data },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.assignedToUserId !== undefined ? { assignedToUserId: body.assignedToUserId } : {}),
      },
      select: {
        id: true, kind: true, email: true, name: true, status: true,
        assignedToUserId: true, updatedAt: true,
      },
    });

    log.audit("lead.updated", {
      leadId: lead.id,
      ...(body.status ? { fromStatus: existing.status, toStatus: body.status } : {}),
      ...(body.assignedToUserId !== undefined
        ? { fromAssignee: existing.assignedToUserId, toAssignee: body.assignedToUserId }
        : {}),
      actorUserId: user.id,
    });

    return lead;
  },
});

/**
 * Delete an intake record.
 *
 * Inquiries and attribution cascade with the lead. A registration-time PENDING user is
 * removed in the same transaction; leaving it behind would reserve the email address
 * and strand a credential for an application that no longer exists. If the lead has
 * already become an account, its login is retired so the address can register again,
 * while historical admissions and financial relations keep their referential record.
 */
export const DELETE = route({
  access: { kind: "permission", require: ["DELETE_LEADS"] },
  rateLimit: RATE_LIMITS.partnerWrite,
  handler: async ({ params, session, log }) => {
    const actor = requireUser(session);
    const parsed = idParam.safeParse(params["id"]);
    if (!parsed.success) {
      throw new ValidationError({ id: ["That is not a valid enquiry."] });
    }

    const result = await db.$transaction(async (tx) => {
      const lead = await tx.lead.findUnique({
        where: { id: parsed.data },
        select: {
          id: true, email: true, kind: true, status: true, convertedUserId: true,
        },
      });
      if (!lead) throw new NotFoundError("We could not find that enquiry.");
      const attachedUser = await tx.user.findUnique({
        where: lead.convertedUserId ? { id: lead.convertedUserId } : { email: lead.email },
        select: {
          id: true, status: true, role: true,
          accounts: { select: { providerId: true, password: true } },
          partner: { select: { id: true } },
          representative: { select: { id: true } },
          studentProfile: { select: { id: true } },
        },
      });

      const removablePendingUser = Boolean(
        attachedUser &&
        attachedUser.status === "PENDING" &&
        (attachedUser.role === "STUDENT" || attachedUser.role === "PARTNER") &&
        attachedUser.accounts.some((account) => account.providerId === "credential" && Boolean(account.password)) &&
        !attachedUser.partner && !attachedUser.representative && !attachedUser.studentProfile,
      );

      const deletedLead = await tx.lead.deleteMany({
        where: { id: lead.id },
      });
      if (deletedLead.count !== 1) {
        throw new ConflictError(
          "lead_changed",
          "This enquiry changed while you were deleting it. Reload and try again.",
        );
      }

      let pendingAccountRemoved = false;
      let activeAccountRetired = false;
      if (attachedUser && removablePendingUser) {
        const deletedUser = await tx.user.deleteMany({
          where: {
            id: attachedUser.id,
            status: "PENDING",
            role: { in: ["STUDENT", "PARTNER"] },
            partner: null,
            representative: null,
            studentProfile: null,
          },
        });
        pendingAccountRemoved = deletedUser.count === 1;
      } else if (
        attachedUser &&
        lead.convertedUserId === attachedUser.id &&
        (attachedUser.role === "STUDENT" || attachedUser.role === "PARTNER")
      ) {
        await retirePublicAccount(tx, attachedUser.id);
        activeAccountRetired = true;
      }

      await recordAudit({
        action: "lead.deleted",
        entityType: "lead",
        entityId: lead.id,
        actorUserId: actor.id,
        metadata: {
          kind: lead.kind,
          previousStatus: lead.status,
          activeAccountRetired,
          pendingAccountRemoved,
        },
      }, tx);

      return { id: lead.id, pendingAccountRemoved, activeAccountRetired };
    });

    log.audit("lead.deleted", {
      leadId: result.id,
      actorUserId: actor.id,
      pendingAccountRemoved: result.pendingAccountRemoved,
      activeAccountRetired: result.activeAccountRetired,
    });
    return { deleted: true };
  },
});
