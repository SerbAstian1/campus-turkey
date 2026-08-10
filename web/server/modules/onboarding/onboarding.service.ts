/**
 * Partner onboarding — turning an approved application into an account.
 *
 * This is the step that was missing. An application could be submitted and read, and
 * then nothing acted on it: there was no code path anywhere that created a partner
 * login, so the only way to onboard anybody was to write SQL by hand.
 *
 * The shape of the flow, and why each part is where it is:
 *
 *   1. Staff approve a `PARTNER` lead and supply the four things an application cannot
 *      know — the partner's role, their named manager, that manager's role, and the
 *      currency they are paid in. Currency especially: it is on the composite foreign
 *      key that makes a commission in the wrong currency unrepresentable, so guessing it
 *      here would be guessing at an integrity constraint.
 *   2. A `User` and a `Partner` are created in one transaction with **no password and no
 *      credential row**. There is no moment where an account exists with a password
 *      somebody else chose.
 *   3. A welcome email goes out with a link. The partner sets their own password there,
 *      confirms a code, and only then can sign in.
 *
 * Step 2 leaving the account passwordless is the load-bearing decision. Staff never know
 * and never transmit a partner's password, so there is no credential to leak in a chat
 * message, and "reset it before first sign-in" stops being a policy nobody follows.
 */

import { randomUUID } from "node:crypto";
import { db, type Db } from "@/server/lib/db";
import { ConflictError, NotFoundError, UnprocessableError } from "@/server/lib/errors";
import type { RequestLogger } from "@/server/lib/logger";
import { sendMail, welcomeEmail } from "@/server/lib/mail";
import { env } from "@/server/lib/config";

export interface ApprovePartnerInput {
  leadId: string;
  role: string;
  managerName: string;
  managerRole: string;
  currency: string;
  territory?: string;
  minimumMinor?: number;
}

export interface ApprovePartnerOutput {
  partnerId: string;
  userId: string;
  email: string;
  /** False when no mail provider is configured — the account exists, nobody was told. */
  welcomeSent: boolean;
}

/** Where the partner goes to set a password. One definition, used by the email and by
 *  the test that follows the link. */
export function setPasswordUrl(): string {
  return `${env.SITE_ORIGIN}/portal/set-password`;
}

/**
 * Read the applicant out of the application.
 *
 * Name, email and country come from the lead's own columns where they exist — those are
 * promoted, typed and maintained, and the JSON copy is whatever the form sent on the day.
 * The org and territory have no column and are read from the payload, defensively:
 * a JSON column is where yesterday's shape lives.
 */
function readPayload(
  payload: unknown,
  lead: { name: string | null; email: string; country: string | null },
): { name: string; email: string; org: string; territory?: string } {
  const record = (payload ?? {}) as Record<string, unknown>;
  const text = (key: string): string | undefined =>
    typeof record[key] === "string" && record[key] !== "" ? (record[key] as string) : undefined;

  const name = lead.name ?? text("name");
  const email = lead.email || text("email");
  const org = text("org");

  // The lead schema guarantees all three for a PARTNER application. Checked anyway,
  // because two of the three still pass through JSON on the way here.
  if (!name || !email || !org) {
    throw new UnprocessableError(
      "incomplete_application",
      "This application is missing a name, email or organisation, so an account cannot be created from it.",
    );
  }

  const territory = text("territory") ?? lead.country ?? text("country");
  return { name, email, org, ...(territory ? { territory } : {}) };
}

/**
 * Approve an application and create the partner.
 *
 * Idempotent on the lead's status rather than on a key: approving twice would create a
 * second partner for the same organisation, and the second one would own no commissions
 * while looking exactly as legitimate as the first. The status check inside the
 * transaction is what makes a double-clicked button harmless.
 */
export async function approvePartnerApplication(
  input: ApprovePartnerInput,
  actor: { id: string },
  log: RequestLogger,
): Promise<ApprovePartnerOutput> {
  const created = await db.$transaction(async (tx: Db) => {
    const lead = await tx.lead.findUnique({
      where: { id: input.leadId },
      select: {
        id: true, status: true,
        name: true, email: true, country: true,
        /**
         * The partner application itself. Since 0011 the payload lives on the inquiry,
         * and a lead can hold several — someone who asked about a degree in March and
         * applied to partner in September is one person with two messages. Filtering by
         * type is what makes sure the org name comes from the partner application and
         * not from whatever they happened to send most recently.
         */
        inquiries: {
          where: { type: "PARTNER" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { payload: true },
        },
      },
    });
    if (!lead) throw new NotFoundError("We could not find that application.");

    const application = lead.inquiries[0];
    if (!application) {
      throw new UnprocessableError(
        "wrong_lead_kind",
        "Only a partner application can become a partner account.",
      );
    }
    if (lead.status === "CONVERTED") {
      throw new ConflictError(
        "already_approved",
        "This application has already been approved and an account exists.",
      );
    }

    const applicant = readPayload(application.payload, lead);

    // An address that already has an account is a person who already works with Campus
    // Turkey. Creating a second one would split their students across two logins.
    const existing = await tx.user.findUnique({
      where: { email: applicant.email },
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
        email: applicant.email,
        name: applicant.name,
        // Not verified, and no credential row: the partner proves the address and
        // chooses the password in the same flow, and cannot sign in until both are done.
        emailVerified: false,
        /* Declared before the partner row is written, because a database trigger
           refuses a partner record whose user is not a PARTNER. That trigger is what
           stops a staff account quietly acquiring a wallet it could then approve
           payouts from. */
        role: "PARTNER",
        /* ACTIVE, deliberately, even though INVITED describes this account more
           precisely.
           INVITED refuses sign-in, and nothing yet flips it to ACTIVE when the password
           is set: that transition would have to happen inside Better Auth's password
           reset, which exposes no hook we control. Setting it here would lock every new
           partner out permanently, which is the exact failure the `requireEmailVerification`
           default already produced once.
           The account is not reachable anyway — it has no credential row until the
           partner creates one. INVITED starts being used when the admin invitation flow
           in §49 lands and brings the transition with it. */
        status: "ACTIVE",
      },
      select: { id: true, email: true },
    });

    const partner = await tx.partner.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        org: applicant.org,
        person: applicant.name,
        role: input.role,
        territory: input.territory ?? applicant.territory ?? "Not stated",
        managerName: input.managerName,
        managerRole: input.managerRole,
        currency: input.currency,
        ...(input.minimumMinor === undefined ? {} : { minimumMinor: input.minimumMinor }),
        since: new Date(),
      },
      select: { id: true, org: true, person: true },
    });

    await tx.lead.update({
      where: { id: lead.id },
      // `convertedUserId` is what makes the conversion traceable — §20's whole purpose is
      // answering "which campaign produced this partner", and without the link the
      // attribution row is orphaned from the account it explains.
      data: { status: "CONVERTED", convertedUserId: user.id },
    });

    return { user, partner, applicant };
  });

  log.audit("partner.approved", {
    leadId: input.leadId,
    partnerId: created.partner.id,
    userId: created.user.id,
    actorUserId: actor.id,
    currency: input.currency,
  });

  // Outside the transaction on purpose. A mail provider that is slow would otherwise
  // hold a database transaction open for its entire timeout, and a mail provider that is
  // down would roll back an approval that is already correct. The account existing is
  // the durable fact; the email is a notification about it, and can be re-sent.
  const mail = await sendMail(welcomeEmail({
    to: created.user.email,
    person: created.partner.person,
    org: created.partner.org,
    setPasswordUrl: setPasswordUrl(),
  }));

  if (!mail.ok) {
    log.error("welcome email failed to send", {
      partnerId: created.partner.id,
      error: mail.error,
    });
  }

  return {
    partnerId: created.partner.id,
    userId: created.user.id,
    email: created.user.email,
    welcomeSent: mail.ok && mail.delivered,
  };
}
