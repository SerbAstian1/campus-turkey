/**
 * POST /api/staff/commissions/:id — confirm or reverse
 *
 * Auth:  required (staff session)
 * Authz: **FINANCE or ADMIN only.**
 *
 *   200  the updated commission
 *   400  validation failed, or `id` is not a uuid
 *   403  SUPPORT attempting to act
 *   404  no such commission
 *   409  transition not allowed from the current state, a note is missing on a
 *        reversal, or someone else moved it first
 *   429  rate limited
 *
 * Confirming is the moment a partner can withdraw. Reversing is the moment they cannot,
 * and it can leave the balance negative if the money is already gone — which is why the
 * service logs that case loudly and the withdrawal endpoint refuses new requests while
 * a balance is overdrawn.
 */

import { z } from "zod";
import { route } from "@/server/http/handler";
import { requireUser } from "@/server/http/session";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { ValidationError } from "@/server/lib/errors";
import { transitionCommission } from "@/server/modules/commissions/commissions.service";
import { transitionCommissionBody } from "@/server/modules/staff/staff.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const idParam = z.string().uuid();

export const POST = route({
  access: { kind: "staff", roles: ["FINANCE", "ADMIN"] },
  rateLimit: RATE_LIMITS.partnerWrite,
  body: transitionCommissionBody,
  handler: async ({ body, params, session, log }) => {
    const user = requireUser(session);

    const parsed = idParam.safeParse(params["id"]);
    if (!parsed.success) {
      throw new ValidationError({ id: ["That is not a valid commission."] });
    }

    return transitionCommission(
      { commissionId: parsed.data, to: body.to, note: body.note ?? null },
      { id: user.id, role: user.staffRole === "ADMIN" ? "ADMIN" : "FINANCE" },
      log,
    );
  },
});
