/**
 * Leads — every public form posts here.
 *
 * Two things make this endpoint different from the rest: it is unauthenticated, and it
 * collects personal data. That combination is why it carries a captcha, a strict rate
 * limit, a per-kind schema, an explicit consent timestamp and a retention date computed
 * at write time.
 *
 * Handoff note 13 asks for exactly this and names the reason: the medical desk collects
 * health information, which is a special category under GDPR and its equivalents.
 */

import { z } from "zod";
import type { Db } from "@/server/lib/db";
import { env } from "@/server/lib/config";
import { ForbiddenError, UnprocessableError } from "@/server/lib/errors";
import type { RequestLogger } from "@/server/lib/logger";

/**
 * Retention, per kind, in days.
 *
 * These are the engineering half of a decision the client has to make — open question
 * 2 in BACKEND-PLAN.md. The values below are defensible defaults, not an answer:
 * ordinary enquiries for two years (an admissions cycle plus a repeat), medical for
 * ninety days (the shortest window that still allows the enquiry to be serviced).
 *
 * Whatever the client decides, the mechanism does not change — only these numbers.
 */
export const RETENTION_DAYS = {
  APPLY: 730,
  CONTACT: 730,
  PARTNER: 1095,
  REPRESENTATIVE: 1095,
  MEDICAL: 90,
} as const;

export type LeadKind = keyof typeof RETENTION_DAYS;

/** Shared across every form. Trimmed and bounded — an unbounded string is a payload. */
const person = {
  name: z.string().trim().min(2, "Enter your full name.").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(254),
  phone: z.string().trim().min(6).max(32).optional(),
  country: z.string().trim().min(2).max(80).optional(),
  message: z.string().trim().max(4000).optional(),
};

/**
 * One schema per kind. A discriminated union rather than a permissive `record`, so an
 * attacker cannot post arbitrary JSON into the `payload` column — everything stored is
 * something a form was designed to collect.
 */
export const leadPayloadSchemas = {
  APPLY: z.object({
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
     * stored, retained for the shortest window of any kind, redacted from every log
     * line by `logger.redact`, and never included in any list response.
     */
    treatment: z.string().trim().max(2000).optional(),
  }),
} as const;

export const submitLeadBody = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("APPLY"), payload: leadPayloadSchemas.APPLY, consent: z.literal(true), captchaToken: z.string().min(1) }),
  z.object({ kind: z.literal("CONTACT"), payload: leadPayloadSchemas.CONTACT, consent: z.literal(true), captchaToken: z.string().min(1) }),
  z.object({ kind: z.literal("PARTNER"), payload: leadPayloadSchemas.PARTNER, consent: z.literal(true), captchaToken: z.string().min(1) }),
  z.object({ kind: z.literal("REPRESENTATIVE"), payload: leadPayloadSchemas.REPRESENTATIVE, consent: z.literal(true), captchaToken: z.string().min(1) }),
  z.object({ kind: z.literal("MEDICAL"), payload: leadPayloadSchemas.MEDICAL, consent: z.literal(true), captchaToken: z.string().min(1) }),
]);

export type SubmitLeadBody = z.infer<typeof submitLeadBody>;

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

export async function submitLead(
  db: Db,
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

  const email = (input.payload as { email: string }).email;
  if (!email) {
    throw new UnprocessableError("lead_no_email", "An email address is required.");
  }

  await db.lead.create({
    data: {
      kind: input.kind,
      payload: input.payload,
      email,
      consentAt: now,
      retentionUntil,
      ipPrefix: context.ipPrefix,
    },
  });

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
 */
export async function purgeExpiredLeads(db: Db, log: RequestLogger): Promise<number> {
  const { count } = await db.lead.deleteMany({
    where: { retentionUntil: { lt: new Date() } },
  });
  if (count > 0) log.info("expired leads purged", { count });
  return count;
}
