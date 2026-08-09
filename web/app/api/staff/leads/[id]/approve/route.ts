/**
 * POST /api/staff/leads/:id/approve — turn a partner application into an account
 *
 * Auth:  required (staff session)
 * Authz: **ADMIN only.**
 *
 *   200  { partnerId, userId, email, welcomeSent }
 *   400  validation failed, or `id` is not a uuid
 *   403  SUPPORT or FINANCE attempting to act
 *   404  no such application
 *   409  already approved, or that email already has an account
 *   422  the application is not a partner application, or is missing required fields
 *   429  rate limited
 *
 * ADMIN rather than FINANCE, which is stricter than every other staff action here.
 * Approving does not move money, so on the face of it FINANCE would do — but it creates
 * a *principal*: a new login that will hold a balance and request payouts. Who may bring
 * a new party into the system is a different question from who may pay an existing one,
 * and it is the narrower of the two.
 *
 * No password is set or sent. The account is created without a credential; the partner
 * chooses their own password and confirms a code at `/portal/set-password`.
 */

import { z } from "zod";
import { route } from "@/server/http/handler";
import { requireUser } from "@/server/http/session";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { ValidationError } from "@/server/lib/errors";
import { approvePartnerApplication } from "@/server/modules/onboarding/onboarding.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const idParam = z.string().uuid();

const approveBody = z.object({
  /** The partner's own job title. Shown to staff on every queue row. */
  role: z.string().trim().min(2).max(120),
  /** Their named contact at Campus Turkey. The portal promises one; this is where it is
   *  recorded, so "your named contact will call" has an answer. */
  managerName: z.string().trim().min(2).max(120),
  managerRole: z.string().trim().min(2).max(120),
  /**
   * ISO 4217. Load-bearing rather than cosmetic: `commission` and `withdrawal` both
   * carry a composite foreign key to `(partner.id, partner.currency)`, so this decides
   * which commissions can ever be recorded against them. Changing it later means
   * rewriting every row that references it.
   */
  currency: z.string().trim().toUpperCase().length(3).regex(/^[A-Z]{3}$/),
  territory: z.string().trim().max(120).optional(),
  /** Minor units. Omitted uses the schema default. */
  minimumMinor: z.number().int().positive().max(10_000_000).optional(),
});

export const POST = route({
  access: { kind: "staff", roles: ["ADMIN"] },
  rateLimit: RATE_LIMITS.partnerWrite,
  body: approveBody,
  handler: async ({ body, params, session, log }) => {
    const user = requireUser(session);

    const parsed = idParam.safeParse(params["id"]);
    if (!parsed.success) {
      throw new ValidationError({ id: ["That is not a valid application."] });
    }

    return approvePartnerApplication(
      {
        leadId: parsed.data,
        role: body.role,
        managerName: body.managerName,
        managerRole: body.managerRole,
        currency: body.currency,
        ...(body.territory ? { territory: body.territory } : {}),
        ...(body.minimumMinor === undefined ? {} : { minimumMinor: body.minimumMinor }),
      },
      { id: user.id },
      log,
    );
  },
});
