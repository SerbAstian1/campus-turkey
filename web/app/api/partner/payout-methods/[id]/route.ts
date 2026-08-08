/**
 * DELETE /api/partner/payout-methods/:id — archive a payout method
 *
 * Auth:  required (session with a partner record)
 * Authz: `payoutMethod.partnerId === session.partner.id`, enforced in the `where`
 *        clause of the update rather than by a check afterwards
 *
 *   200  { ok: true }
 *   400  `id` is not a uuid
 *   401  no session
 *   403  session is not a partner, or the origin check failed
 *   404  no such method, OR the method belongs to another partner — deliberately
 *        indistinguishable, so this endpoint cannot confirm that an id exists
 *   429  rate limited
 *
 * Archive, not delete. A withdrawal references the method it paid to; removing the row
 * would tear a hole in the record a dispute is settled from, and the `onDelete:
 * Restrict` on that relation means Postgres would refuse in any case.
 */

import { z } from "zod";
import { route } from "@/server/http/handler";
import { requirePartner } from "@/server/http/session";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { ValidationError } from "@/server/lib/errors";
import { db } from "@/server/lib/db";
import { removeMethod } from "@/server/modules/payout-methods/payout-methods.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const idParam = z.string().uuid();

export const DELETE = route({
  access: { kind: "partner" },
  rateLimit: RATE_LIMITS.partnerWrite,
  handler: async ({ params, session, log }) => {
    const partner = requirePartner(session);

    // A path parameter is untrusted input like any other. Without this, a non-uuid
    // reaches Prisma and surfaces as a 500 with a database error in the log rather
    // than a 400 the caller can act on.
    const parsed = idParam.safeParse(params["id"]);
    if (!parsed.success) {
      throw new ValidationError({ id: ["That is not a valid payout method."] });
    }

    await removeMethod(db, partner.id, parsed.data, log);
    return { ok: true };
  },
});
