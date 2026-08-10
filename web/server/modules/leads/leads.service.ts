/**
 * Leads — every public form posts here.
 *
 * Two things make this endpoint different from the rest: it is unauthenticated, and it
 * collects personal data. That combination is why it carries a captcha, a strict rate
 * limit, a per-type schema, an explicit consent timestamp and a retention date computed
 * at write time.
 *
 * Handoff note 13 asks for exactly this and names the reason: the medical desk collects
 * health information, which is a special category under GDPR and its equivalents.
 *
 * Since 0011 a submission writes two rows, not one — a `Lead` for the person and an
 * `Inquiry` for the message. See the schema for why. The consequence here is that a
 * second enquiry from a known address updates a record instead of creating a duplicate,
 * and that retention is enforced per message rather than per person.
 */

import { z } from "zod";
import { Prisma, type PrismaClient } from "@prisma/client";
import { env } from "@/server/lib/config";
import { ForbiddenError, UnprocessableError } from "@/server/lib/errors";
import type { RequestLogger } from "@/server/lib/logger";

/**
 * Retention, per type, in days.
 *
 * These are the engineering half of a decision the client has to make — open question
 * 2 in BACKEND-PLAN.md. The values below are defensible defaults, not an answer:
 * ordinary enquiries for two years (an admissions cycle plus a repeat), medical for
 * ninety days (the shortest window that still allows the enquiry to be serviced).
 *
 * Whatever the client decides, the mechanism does not change — only these numbers.
 */
export const RETENTION_DAYS = {
  STUDY: 730,
  CONTACT: 730,
  BUSINESS: 730,
  EMPLOYMENT: 730,
  TOURS: 730,
  PARTNER: 1095,
  REPRESENTATIVE: 1095,
  MEDICAL: 90,
} as const;

/**
 * What a form may declare itself as.
 *
 * The database enum still accepts `APPLY`; this list does not, which is what stops the
 * deprecated value coming back after 0012 rewrote it away. The column is the wider
 * gate and this is the narrower one — the narrower one is the one requests pass through.
 */
export const leadTypes = Object.keys(RETENTION_DAYS) as LeadType[];

export type LeadType = keyof typeof RETENTION_DAYS;

/** Shared across every form. Trimmed and bounded — an unbounded string is a payload. */
const person = {
  name: z.string().trim().min(2, "Enter your full name.").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(254),
  phone: z.string().trim().min(6).max(32).optional(),
  country: z.string().trim().min(2).max(80).optional(),
  message: z.string().trim().max(4000).optional(),
};

/** The four service desks share a shape: who you are, and what you want doing. */
const serviceEnquiry = z.object({
  ...person,
  subject: z.string().trim().max(200).optional(),
});

/**
 * One schema per type. A discriminated union rather than a permissive `record`, so an
 * attacker cannot post arbitrary JSON into the `payload` column — everything stored is
 * something a form was designed to collect.
 */
export const leadPayloadSchemas = {
  STUDY: z.object({
    ...person,
    universitySlug: z.string().trim().max(120).optional(),
    program: z.string().trim().max(200).optional(),
    intake: z.string().trim().max(40).optional(),
    level: z.enum(["foundation", "bachelor", "master", "phd"]).optional(),
  }),
  CONTACT: z.object({ ...person, subject: z.string().trim().max(200).optional() }),
  PARTNER: z.object({
    ...person,
    org: z.string().trim().min(2).max(200),
    territory: z.string().trim().max(120).optional(),
    website: z.string().trim().url().max(300).optional(),
    volume: z.string().trim().max(80).optional(),
  }),
  REPRESENTATIVE: z.object({
    ...person,
    territory: z.string().trim().max(120).optional(),
    experience: z.string().trim().max(2000).optional(),
  }),
  MEDICAL: z.object({
    ...person,
    /**
     * Free text describing what the enquirer is seeking. This is health data. It is
     * stored, retained for the shortest window of any type, redacted from every log
     * line by `logger.redact`, and never included in any list response.
     */
    treatment: z.string().trim().max(2000).optional(),
  }),
  /** Business Facilitation — §22's sourcing brief. */
  BUSINESS: serviceEnquiry.extend({
    org: z.string().trim().max(200).optional(),
    sector: z.string().trim().max(120).optional(),
  }),
  EMPLOYMENT: serviceEnquiry.extend({
    field: z.string().trim().max(120).optional(),
    experienceYears: z.number().int().min(0).max(60).optional(),
  }),
  TOURS: serviceEnquiry.extend({
    groupSize: z.number().int().min(1).max(500).optional(),
    travelWindow: z.string().trim().max(80).optional(),
  }),
} as const satisfies Record<LeadType, z.ZodTypeAny>;

/**
 * Where the visitor came from — brief §20.
 *
 * Every field is optional and every field is bounded. This arrives from the client, so
 * it is exactly as trustworthy as any other request body: a campaign name is a string
 * someone can set to anything, and it is stored, never executed, never interpolated.
 */
export const attributionSchema = z
  .object({
    source: z.string().trim().max(120).optional(),
    medium: z.string().trim().max(120).optional(),
    campaign: z.string().trim().max(160).optional(),
    term: z.string().trim().max(160).optional(),
    content: z.string().trim().max(160).optional(),
    landingPage: z.string().trim().max(512).optional(),
    referrer: z.string().trim().max(512).optional(),
  })
  .optional();

const base = {
  consent: z.literal(true),
  captchaToken: z.string().min(1),
  attribution: attributionSchema,
  /** Which service page the form was on. Recorded even when `type` is CONTACT. */
  serviceInterest: z.string().trim().max(80).optional(),
};

/**
 * Written out rather than generated from `leadTypes`, so that adding a value to
 * `RETENTION_DAYS` without adding it here is a type error rather than a runtime gap. A
 * `.map()` over the types would compile and quietly accept whatever it was given.
 */
export const submitLeadBody = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("STUDY"), payload: leadPayloadSchemas.STUDY, ...base }),
  z.object({ kind: z.literal("CONTACT"), payload: leadPayloadSchemas.CONTACT, ...base }),
  z.object({ kind: z.literal("MEDICAL"), payload: leadPayloadSchemas.MEDICAL, ...base }),
  z.object({ kind: z.literal("BUSINESS"), payload: leadPayloadSchemas.BUSINESS, ...base }),
  z.object({ kind: z.literal("EMPLOYMENT"), payload: leadPayloadSchemas.EMPLOYMENT, ...base }),
  z.object({ kind: z.literal("TOURS"), payload: leadPayloadSchemas.TOURS, ...base }),
  z.object({ kind: z.literal("PARTNER"), payload: leadPayloadSchemas.PARTNER, ...base }),
  z.object({ kind: z.literal("REPRESENTATIVE"), payload: leadPayloadSchemas.REPRESENTATIVE, ...base }),
]);

export type SubmitLeadBody = z.infer<typeof submitLeadBody>;

/**
 * The check that makes the claim above true. Adding a type to `RETENTION_DAYS` and
 * forgetting the union member above fails here, at compile time, naming the missing
 * value — rather than at runtime as a 400 on a form nobody tested.
 */
const _everyTypeAccepted: Exclude<LeadType, SubmitLeadBody["kind"]> extends never ? true : never = true;
void _everyTypeAccepted;

/**
 * `consent: z.literal(true)` is worth pausing on. A boolean would accept `false` and
 * store a lead with `consentAt` set anyway, which is worse than no record at all — it
 * would be a false attestation. Requiring the literal makes an unconsented submission
 * a 400 at the boundary.
 */

/** Verify the captcha with the provider. Fails closed: no verification, no lead. */
async function verifyCaptcha(token: string, ip: string | null, log: RequestLogger): Promise<boolean> {
  if (env.CAPTCHA_PROVIDER === "disabled") {
    // Production refuses to boot with the captcha disabled (see config.ts), so this
    // branch is development only.
    return true;
  }

  const endpoint =
    env.CAPTCHA_PROVIDER === "turnstile"
      ? "https://challenges.cloudflare.com/turnstile/v0/siteverify"
      : "https://api.hcaptcha.com/siteverify";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: env.CAPTCHA_SECRET ?? "",
        response: token,
        ...(ip ? { remoteip: ip } : {}),
      }),
    });

    if (!response.ok) return false;
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch (error) {
    // A captcha provider outage blocks the contact form. That is the correct direction
    // to fail for an unauthenticated write endpoint: the alternative is an open spam
    // relay for the duration of someone else's incident.
    log.error("captcha verification failed", { provider: env.CAPTCHA_PROVIDER, error });
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The message body, wherever this form happened to put it.
 *
 * Promoted to a column because staff read it in the inbox, and reaching into JSON for
 * the one field everybody opens is a false economy. MEDICAL calls it `treatment` and
 * REPRESENTATIVE calls it `experience`; both are the body of the message under another
 * name, and the inbox should not have to know that.
 */
function messageOf(payload: Record<string, unknown>): string | null {
  for (const key of ["message", "treatment", "experience"] as const) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function stringOf(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function submitLead(
  db: PrismaClient,
  input: SubmitLeadBody,
  context: { ipPrefix: string | null; ip: string | null },
  log: RequestLogger,
): Promise<{ ok: true }> {
  const passed = await verifyCaptcha(input.captchaToken, context.ip, log);
  if (!passed) {
    throw new ForbiddenError("We could not verify that submission. Please try again.");
  }

  const now = new Date();
  const retentionUntil = new Date(now);
  retentionUntil.setUTCDate(retentionUntil.getUTCDate() + RETENTION_DAYS[input.kind]);

  const payload = input.payload as Record<string, unknown>;
  const email = stringOf(payload, "email")?.toLowerCase();
  if (!email) {
    throw new UnprocessableError("lead_no_email", "An email address is required.");
  }

  const person = {
    name: stringOf(payload, "name"),
    phone: stringOf(payload, "phone"),
    country: stringOf(payload, "country"),
    serviceInterest: input.serviceInterest ?? null,
  };

  /**
   * One transaction, because a lead with no inquiry is a person on file with no reason
   * for being there — a data-protection problem as well as a useless row.
   *
   * `lead.retentionUntil` and `lead.consentAt` are deliberately absent from the update
   * branch: the `inquiry_sync_lead_retention` trigger owns both. Writing them here would
   * be the second source of truth the trigger exists to prevent.
   */
  const write = () =>
    db.$transaction(async (tx) => {
      const existing = await tx.lead.findUnique({
        where: { email },
        select: { id: true, status: true },
      });

      const lead = await tx.lead.upsert({
        where: { email },
        create: {
          email,
          kind: input.kind,
          ...person,
          consentAt: now,
          retentionUntil,
          ipPrefix: context.ipPrefix,
        },
        update: {
          // Only fill gaps. A returning visitor who left the phone field blank this time
          // should not erase the number they gave last time, and the newest non-empty
          // answer is the best one available for a field they did fill in.
          ...(person.name ? { name: person.name } : {}),
          ...(person.phone ? { phone: person.phone } : {}),
          ...(person.country ? { country: person.country } : {}),
          ...(person.serviceInterest ? { serviceInterest: person.serviceInterest } : {}),
          /**
           * A closed lead that writes in again is open again. Without this, a second
           * enquiry lands on a row nobody is looking at any more — which presents to the
           * visitor as being ignored, and is the one failure this endpoint exists to
           * prevent. A lead already CONVERTED stays converted; they have an account.
           */
          ...(existing?.status === "CLOSED" ? { status: "NEW" as const } : {}),
        },
        select: { id: true },
      });

      await tx.inquiry.create({
        data: {
          leadId: lead.id,
          type: input.kind,
          subject: stringOf(payload, "subject"),
          message: messageOf(payload),
          payload: input.payload,
          consentAt: now,
          retentionUntil,
          ipPrefix: context.ipPrefix,
        },
      });

      /**
       * First touch, not last. `createMany` with `skipDuplicates` rather than an upsert:
       * a campaign that gets credit for a visitor's third enquiry is measuring
       * remarketing, not acquisition, and overwriting the original loses the only record
       * of where they actually came from.
       */
      if (input.attribution && Object.keys(input.attribution).length > 0) {
        await tx.leadAttribution.createMany({
          data: [{ leadId: lead.id, ...input.attribution }],
          skipDuplicates: true,
        });
      }
    });

  try {
    await write();
  } catch (error) {
    /**
     * Two submissions from the same new address at the same moment.
     *
     * Both transactions read no existing lead, both take the `create` branch, and the
     * second loses the unique index — P2002 on `lead_email_key`. Prisma's `upsert` does
     * not close this: the read and the write are separate statements, and READ COMMITTED
     * is doing exactly what it promises.
     *
     * Retried once rather than escalated to SERIALIZABLE, because the losing transaction
     * now finds the row the winner created and takes the `update` branch, which is the
     * correct outcome and needs no isolation guarantee to reach. A second failure is a
     * real error and propagates: this endpoint must not become a retry loop, since it is
     * unauthenticated and someone can call it as fast as the rate limit allows.
     */
    const isDuplicate =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
    if (!isDuplicate) throw error;

    log.info("lead write raced on email; retrying as an update");
    await write();
  }

  // Neither the payload nor the email is in this line. `logger.redact` would strip
  // them in production regardless; not passing them is the first line of defence.
  log.info("lead received", { kind: input.kind, retentionDays: RETENTION_DAYS[input.kind] });

  return { ok: true };
}

/**
 * The retention purge. Run daily by a scheduled job — see docs/RUNBOOK.md.
 *
 * Hard delete, not soft: a retention policy satisfied by a `deletedAt` column is not a
 * retention policy, because the data is still there.
 *
 * Two passes, and the order matters:
 *
 *   1. Expired **inquiries** go first. This is what stops a 90-day medical enquiry
 *      living for two years because the same person later sent a contact form. The
 *      trigger recomputes the lead's window from what survives.
 *   2. Leads with nothing left then go. A person with no enquiry on file is a person
 *      whose details are being kept for no stated reason.
 */
export async function purgeExpiredLeads(db: PrismaClient, log: RequestLogger): Promise<number> {
  const now = new Date();

  const inquiries = await db.inquiry.deleteMany({ where: { retentionUntil: { lt: now } } });

  /**
   * Converted leads are kept. They are an account holder's origin record, retained under
   * the account's own basis rather than the enquiry's — deleting one would sever a
   * referral from the commission paid on it.
   */
  const leads = await db.lead.deleteMany({
    where: { inquiries: { none: {} }, status: { not: "CONVERTED" } },
  });

  if (inquiries.count > 0 || leads.count > 0) {
    log.info("expired leads purged", { inquiries: inquiries.count, leads: leads.count });
  }
  return leads.count;
}
