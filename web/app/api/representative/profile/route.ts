/**
 * GET   /api/representative/profile — who this representative is
 * PATCH /api/representative/profile — update their own contact details
 *
 * Auth:  required (session with a representative profile)
 * Authz: READ_OWN_PROFILE / UPDATE_OWN_PROFILE
 *
 *   200  the profile
 *   400  validation failed
 *   401  no session
 *   403  not a representative
 *   429  rate limited
 *
 * `territory` and `status` are readable and **not** writable. Both are terms of the
 * arrangement, agreed by Campus Turkey: a representative who could widen their own
 * territory could claim referrals in somebody else's, and one who could set their own
 * status could reactivate a suspended account. Contact details are theirs to correct.
 */

import { z } from "zod";
import { route } from "@/server/http/handler";
import { requireRepresentative } from "@/server/http/session";
import { db } from "@/server/lib/db";
import { RATE_LIMITS } from "@/server/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROFILE_FIELDS = {
  id: true,
  fullName: true,
  organizationName: true,
  country: true,
  email: true,
  phone: true,
  address: true,
  territory: true,
  status: true,
  since: true,
} as const;

/** Only the fields a representative may change about themselves. Anything absent from
 *  this schema is unwritable by construction rather than by a filter somebody maintains. */
const updateBody = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  organizationName: z.string().trim().max(200).optional(),
  phone: z.string().trim().min(6).max(32).optional(),
  address: z.string().trim().max(300).optional(),
});

export const GET = route({
  access: { kind: "permission", require: ["READ_OWN_PROFILE"] },
  rateLimit: RATE_LIMITS.partnerRead,
  handler: async ({ session }) => {
    const representative = requireRepresentative(session);
    return db.representativeProfile.findUniqueOrThrow({
      where: { id: representative.id },
      select: PROFILE_FIELDS,
    });
  },
});

export const PATCH = route({
  access: { kind: "permission", require: ["UPDATE_OWN_PROFILE"] },
  rateLimit: RATE_LIMITS.partnerWrite,
  body: updateBody,
  handler: async ({ body, session, log }) => {
    const representative = requireRepresentative(session);

    const updated = await db.representativeProfile.update({
      // Scoped to the session's own id. A representative id from the request body would
      // let one representative edit another's profile, which is the whole bug class.
      where: { id: representative.id },
      data: body,
      select: PROFILE_FIELDS,
    });

    log.audit("representative.profile_updated", {
      representativeId: representative.id,
      fields: Object.keys(body),
    });

    return updated;
  },
});
