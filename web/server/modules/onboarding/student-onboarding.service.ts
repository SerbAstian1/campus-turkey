/**
 * Turning a direct STUDY enquiry into a student account.
 *
 * `onboarding.service.ts` does this for a partner application. This is its twin for the
 * enquiry that arrives with nobody behind it — someone who used the public "Apply" form
 * or the student tab at `/portal` rather than being referred by an agency.
 *
 * **Why this could not simply reuse the referral model.** A `Student` row's whole reason
 * for existing is answering "which partner or representative gets credit for this
 * person" — its CHECK constraint requires exactly one of `partnerId`/`representativeId` to
 * be set, because that attribution is what a commission is paid against. A direct
 * applicant has neither. Rather than loosen that constraint — which every commission and
 * reporting query would then have to handle a third case for — this attributes direct
 * applicants to one fixed, non-commissioned house `Partner` record
 * (`HOUSE_PARTNER_EMAIL`), created once by `scripts/create-house-partner.mjs` and never
 * signed into. It costs one honest fiction ("referred by Campus Turkey") in exchange for
 * every other part of the system — the partner portal's queries, the commission
 * composite key, the reporting — staying exactly as they are.
 *
 * **Why this skips the claim-code flow `claiming.service.ts` implements.** That flow
 * exists because an agency refers someone whose email it cannot vouch for, so the
 * student proves who they are by typing a code the agency handed them in person. Here
 * staff already have the applicant's own email, from the enquiry they submitted
 * themselves — there is no second party to hand a code to, so the account, the profile
 * and the link between them are created in one step, the same way a partner's account is.
 *
 * **What this does not yet solve.** The claim-code flow itself has no working entry
 * point anywhere in this codebase: creating a `Student` referral never creates the
 * account a student would sign into before claiming it. This module does not fix that —
 * it gives *direct* applicants a working path by not needing the claim step at all. A
 * partner-referred student still has no way to get an account today.
 */

import { randomUUID } from "node:crypto";
import { db, type Db } from "@/server/lib/db";
import { ConflictError, NotFoundError, UnprocessableError } from "@/server/lib/errors";
import type { RequestLogger } from "@/server/lib/logger";
import { sendMail, studentWelcomeEmail } from "@/server/lib/mail";
import { env } from "@/server/lib/config";

/** Never signed into. See the module header for why this exists at all. */
export const HOUSE_PARTNER_EMAIL = "direct-applicants@campusturkey.org";

export interface ApproveStudentInput {
  leadId: string;
  universityName: string;
  program?: string;
  /** Falls back to the lead's own `country`. Required from one place or the other —
   *  `StudentProfile.nationality` and `countryOfResidence` have no default. */
  country?: string;
}

export interface ApproveStudentOutput {
  studentId: string;
  userId: string;
  email: string;
  welcomeSent: boolean;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function setPasswordUrl(): string {
  return `${env.SITE_ORIGIN}/portal/set-password`;
}

export async function approveStudentApplication(
  input: ApproveStudentInput,
  actor: { id: string },
  log: RequestLogger,
): Promise<ApproveStudentOutput> {
  const created = await db.$transaction(async (tx: Db) => {
    const lead = await tx.lead.findUnique({
      where: { id: input.leadId },
      select: { id: true, status: true, kind: true, name: true, email: true, country: true },
    });
    if (!lead) throw new NotFoundError("We could not find that enquiry.");

    if (lead.kind !== "STUDY") {
      throw new UnprocessableError(
        "wrong_lead_kind",
        "Only a study enquiry can become a student account.",
      );
    }
    if (lead.status === "CONVERTED") {
      throw new ConflictError(
        "already_approved",
        "This enquiry has already become an account.",
      );
    }

    const name = lead.name;
    const country = input.country?.trim() || lead.country;
    if (!name || !lead.email || !country) {
      throw new UnprocessableError(
        "incomplete_application",
        "This enquiry is missing a name, email or country, so an account cannot be created from it.",
      );
    }

    const existingUser = await tx.user.findUnique({
      where: { email: lead.email },
      select: { id: true },
    });
    if (existingUser) {
      throw new ConflictError(
        "email_in_use",
        "Somebody already has an account with that email address.",
      );
    }

    const housePartner = await tx.partner.findFirst({
      where: { user: { email: HOUSE_PARTNER_EMAIL } },
      select: { id: true },
    });
    if (!housePartner) {
      // Not a user-facing message — this is an operator having skipped the one-time
      // setup script, not something an applicant's own data could ever trigger.
      throw new UnprocessableError(
        "house_partner_missing",
        "The direct-applicant account has not been set up yet. Run scripts/create-house-partner.mjs first.",
      );
    }

    const [firstName, ...rest] = name.trim().split(/\s+/);

    const user = await tx.user.create({
      data: {
        id: randomUUID(),
        email: lead.email,
        name,
        // Passwordless, exactly as a new partner account is — the applicant proves the
        // address and chooses the password in the same flow, and cannot sign in until
        // both are done.
        emailVerified: false,
        role: "STUDENT",
        status: "ACTIVE",
      },
      select: { id: true, email: true },
    });

    const profile = await tx.studentProfile.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        firstName: firstName ?? name,
        lastName: rest.join(" "),
        nationality: country,
        countryOfResidence: country,
      },
      select: { id: true },
    });

    const universityName = input.universityName.trim();

    const student = await tx.student.create({
      data: {
        id: randomUUID(),
        partnerId: housePartner.id,
        profileId: profile.id,
        name,
        universitySlug: slugify(universityName),
        universityName,
        program: input.program?.trim() || "Not yet decided",
        stage: "ENQUIRY",
      },
      select: { id: true },
    });

    await tx.lead.update({
      where: { id: lead.id },
      data: { status: "CONVERTED", convertedUserId: user.id },
    });

    return { user, student, name };
  });

  log.audit("student.approved", {
    leadId: input.leadId,
    studentId: created.student.id,
    userId: created.user.id,
    actorUserId: actor.id,
  });

  // Outside the transaction for the same reason the partner flow's email is: a slow or
  // down mail provider must not hold the database transaction open or roll back an
  // approval that has already correctly happened.
  const mail = await sendMail(studentWelcomeEmail({
    to: created.user.email,
    person: created.name,
    setPasswordUrl: setPasswordUrl(),
  }));

  if (!mail.ok) {
    log.error("student welcome email failed to send", {
      studentId: created.student.id,
      error: mail.error,
    });
  }

  return {
    studentId: created.student.id,
    userId: created.user.id,
    email: created.user.email,
    welcomeSent: mail.ok && mail.delivered,
  };
}
