/**
 * Representative onboarding — brief §23, §65.
 *
 * Deliberately parallel to `onboarding.service.ts` (partners) rather than shared with it.
 * §29 is explicit that the two roles must not share permissions, and a shared service is
 * how a shared permission arrives without anybody deciding to add one: the first time the
 * two flows diverge, the branch goes inside the shared function, and from then on every
 * change to either has to be reasoned about for both.
 *
 * They will diverge. A partner has a currency, a payout minimum and a wallet; a
 * representative has a territory and none of those. What is genuinely common — creating a
 * passwordless account, sending an invitation — already lives in `mail.ts` and is used by
 * both.
 */

import { randomUUID } from "node:crypto";
import { db, type Db } from "@/server/lib/db";
import { ConflictError, NotFoundError, UnprocessableError } from "@/server/lib/errors";
import type { RequestLogger } from "@/server/lib/logger";
import { sendMail, welcomeEmail } from "@/server/lib/mail";
import { setPasswordUrl } from "@/server/modules/onboarding/onboarding.service";
import { recordAudit } from "@/server/modules/audit/audit.service";
import type { SubmitRepresentativeApplicationBody } from "./representatives.schema";

/**
 * Record an application from the public form.
 *
 * Returns nothing identifying. The response is the same whether or not this address has
 * applied before, because a public endpoint that says "you already applied" is an
 * endpoint that confirms who Campus Turkey is talking to.
 */
export async function submitRepresentativeApplication(
  input: SubmitRepresentativeApplicationBody,
  log: RequestLogger,
): Promise<void> {
  try {
    await db.representativeApplication.create({
      data: {
        id: randomUUID(),
        fullName: input.fullName,
        country: input.country,
        email: input.email,
        ...(input.organizationName ? { organizationName: input.organizationName } : {}),
        ...(input.territory ? { territory: input.territory } : {}),
        ...(input.phone ? { phone: input.phone } : {}),
        ...(input.address ? { address: input.address } : {}),
        ...(input.message ? { message: input.message } : {}),
      },
    });

    log.audit("representative_application.submitted", { country: input.country });
  } catch (error) {
    /**
     * The partial unique index refuses a second *open* application for one address.
     * Swallowed on purpose: re-submitting is what a person does when they are not sure
     * the first one arrived, and telling them it failed would make them try again. The
     * application they already have is the correct outcome.
     */
    if (isOpenApplicationConflict(error)) {
      log.info("duplicate representative application ignored");
      return;
    }
    throw error;
  }
}

/**
 * Was this a second open application for the same address?
 *
 * Prisma reports `meta.target` as the *field list* the constraint covers — `["email"]` —
 * not the index name, even when the index was created by hand in a migration. Matching on
 * the name looked more precise and never matched, so every duplicate submission became a
 * 500 while the guard sat there reading correctly.
 *
 * Matching on the field is sufficient here because `email` carries exactly one uniqueness
 * rule on this table: the partial index for open applications. If a second one is ever
 * added, this needs to distinguish them, so the assertion is written down rather than
 * assumed.
 */
function isOpenApplicationConflict(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  if (code !== "P2002") return false;

  const target = (error as { meta?: { target?: unknown } })?.meta?.target;
  const fields = Array.isArray(target) ? target.map(String) : [String(target)];

  return (
    fields.includes("email") ||
    fields.some((f) => f.includes("representative_application_one_open_per_email"))
  );
}

export interface ApproveRepresentativeOutput {
  representativeId: string;
  userId: string;
  email: string;
  /** False when no mail provider is configured: the account exists, nobody was told. */
  welcomeSent: boolean;
}

/**
 * Approve an application and create the representative.
 *
 * The account is created with no password and no credential row, exactly as a partner's
 * is: nobody at Campus Turkey ever knows a representative's password, and there is no
 * credential to leak. They set their own at `/portal/set-password`, which already exists
 * and needs no change to serve a second role.
 */
export async function approveRepresentativeApplication(
  input: { applicationId: string; territory?: string },
  actor: { id: string },
  log: RequestLogger,
): Promise<ApproveRepresentativeOutput> {
  const created = await db.$transaction(async (tx: Db) => {
    const application = await tx.representativeApplication.findUnique({
      where: { id: input.applicationId },
      select: {
        id: true, status: true, fullName: true, organizationName: true,
        country: true, territory: true, email: true, phone: true, address: true,
      },
    });
    if (!application) throw new NotFoundError("We could not find that application.");

    if (application.status === "APPROVED") {
      throw new ConflictError(
        "already_approved",
        "This application has already been approved and an account exists.",
      );
    }
    if (application.status === "REJECTED") {
      throw new UnprocessableError(
        "already_rejected",
        "This application was rejected. Ask them to apply again rather than reversing the decision.",
      );
    }

    const existing = await tx.user.findUnique({
      where: { email: application.email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictError(
        "email_in_use",
        "Somebody already has an account with that email address.",
      );
    }

    const user = await tx.user.create({
      data: {
        id: randomUUID(),
        email: application.email,
        name: application.fullName,
        emailVerified: false,
        // Declared before the profile row: a trigger refuses a representative profile
        // whose user is not a REPRESENTATIVE.
        role: "REPRESENTATIVE",
        status: "ACTIVE",
      },
      select: { id: true, email: true },
    });

    const representative = await tx.representativeProfile.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        fullName: application.fullName,
        country: application.country,
        email: application.email,
        status: "ACTIVE",
        since: new Date(),
        ...(application.organizationName ? { organizationName: application.organizationName } : {}),
        ...(input.territory ?? application.territory
          ? { territory: input.territory ?? application.territory }
          : {}),
        ...(application.phone ? { phone: application.phone } : {}),
        ...(application.address ? { address: application.address } : {}),
      },
      select: { id: true, fullName: true, territory: true },
    });

    await tx.representativeApplication.update({
      where: { id: application.id },
      data: { status: "APPROVED", reviewedByUserId: actor.id, reviewedAt: new Date() },
    });

    /*
     * Recorded inside the transaction for the reason `applications.service` gives about
     * its own: an audit row written after a commit that then failed describes something
     * that never happened. This is the entry that answers who admitted this partner.
     *
     * `log.audit` below is not this. That writes a line to the log stream, which is not
     * queryable from the console and is not what `/api/staff/audit-logs` reads — the
     * decisions were being logged and never recorded, which is why that table was empty.
     */
    await recordAudit(
      {
        action: "representative_application.approved",
        entityType: "representative_application",
        entityId: input.applicationId,
        actorUserId: actor.id,
        metadata: {
          representativeId: representative.id,
          userId: user.id,
          ...(input.territory?.trim() ? { territory: input.territory.trim() } : {}),
        },
      },
      tx,
    );

    return { user, representative };
  });

  log.audit("representative.approved", {
    applicationId: input.applicationId,
    representativeId: created.representative.id,
    userId: created.user.id,
    actorUserId: actor.id,
  });

  // Outside the transaction: a slow provider would otherwise hold it open, and a provider
  // that is down would roll back an approval that is already correct.
  const mail = await sendMail(welcomeEmail({
    to: created.user.email,
    person: created.representative.fullName,
    org: created.representative.territory ?? "Campus Turkey",
    setPasswordUrl: setPasswordUrl(),
  }));

  if (!mail.ok) {
    log.error("representative welcome email failed to send", {
      representativeId: created.representative.id,
      error: mail.error,
    });
  }

  return {
    representativeId: created.representative.id,
    userId: created.user.id,
    email: created.user.email,
    welcomeSent: mail.ok && mail.delivered,
  };
}

/**
 * Reject an application.
 *
 * The note is required and stored. Nothing sends it automatically — a rejection is a
 * conversation someone should have, not an automated email — but it must exist, because
 * this is the row read when the decision is questioned later.
 */
export async function rejectRepresentativeApplication(
  input: { applicationId: string; note: string },
  actor: { id: string },
  log: RequestLogger,
): Promise<void> {
  const application = await db.representativeApplication.findUnique({
    where: { id: input.applicationId },
    select: { id: true, status: true },
  });
  if (!application) throw new NotFoundError("We could not find that application.");

  if (application.status === "APPROVED" || application.status === "REJECTED") {
    throw new ConflictError(
      "already_decided",
      "This application has already been decided.",
    );
  }

  /*
   * The update and the record go in one transaction. Separately, a rejection could be
   * stored with no entry saying who made it, which is the one thing this row exists to
   * answer when the decision is questioned later.
   */
  await db.$transaction(async (tx: Db) => {
    await tx.representativeApplication.update({
      where: { id: application.id },
      data: {
        status: "REJECTED",
        reviewNote: input.note,
        reviewedByUserId: actor.id,
        reviewedAt: new Date(),
      },
    });

    await recordAudit(
      {
        action: "representative_application.rejected",
        entityType: "representative_application",
        entityId: application.id,
        actorUserId: actor.id,
        // The note is the whole of the decision, so it is stored verbatim. Redaction
        // strips forbidden *keys*, not prose — a reviewer who types a secret into a
        // rejection reason has put it somewhere append-only. §26 accepts that trade.
        metadata: { note: input.note },
      },
      tx,
    );
  });

  log.audit("representative_application.rejected", {
    applicationId: input.applicationId,
    actorUserId: actor.id,
  });
}
