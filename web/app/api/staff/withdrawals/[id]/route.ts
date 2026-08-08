/**
 * POST /api/staff/withdrawals/:id — approve, reject, process or mark paid
 *
 * Auth:  required (staff session)
 * Authz: **FINANCE or ADMIN only.** Support can read the queue and cannot move money.
 *
 *   200  the updated withdrawal
 *   400  validation failed, or `id` is not a uuid
 *   401  no session
 *   403  not staff, or SUPPORT attempting to act
 *   404  no such withdrawal
 *   409  the transition is not allowed from the current status, a note is missing on a
 *        rejection, or someone else moved it first (compare-and-swap lost)
 *   429  rate limited
 *
 * This is the endpoint the portal's promise depends on — "reviewed the same working
 * day" is only true if a human has somewhere to do the reviewing. Until now the service
 * layer could do this and nothing exposed it.
 *
 * Two guarantees worth restating, because this is where money starts moving:
 *
 *   - The state machine refuses `PARTNER` as an actor for every transition, so even if
 *     this route were mis-gated a partner still could not approve their own payout.
 *   - Every transition writes an append-only `withdrawal_event` naming the staff user.
 *     The database has a trigger that refuses UPDATE and DELETE on that table, so the
 *     record of who approved what cannot be edited afterwards.
 */

import { z } from "zod";
import { route } from "@/server/http/handler";
import { requireUser } from "@/server/http/session";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { ValidationError } from "@/server/lib/errors";
import { transitionWithdrawal } from "@/server/modules/withdrawals/withdrawals.service";
import { transitionWithdrawalBody } from "@/server/modules/staff/staff.schema";
import { toWithdrawalDto } from "@/server/types/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const idParam = z.string().uuid();

export const POST = route({
  access: { kind: "staff", roles: ["FINANCE", "ADMIN"] },
  rateLimit: RATE_LIMITS.partnerWrite,
  body: transitionWithdrawalBody,
  handler: async ({ body, params, session, log }) => {
    const user = requireUser(session);

    const parsed = idParam.safeParse(params["id"]);
    if (!parsed.success) {
      throw new ValidationError({ id: ["That is not a valid withdrawal."] });
    }

    const withdrawal = await transitionWithdrawal(
      {
        withdrawalId: parsed.data,
        to: body.to,
        // Staff acting through the console are FINANCE to the state machine. The
        // SYSTEM actor is reserved for the provider webhook, which may settle a
        // payout but may not approve one.
        actor: "FINANCE",
        actorUserId: user.id,
        note: body.note ?? null,
        ...(body.providerRef ? { providerRef: body.providerRef } : {}),
      },
      log,
    );

    return toWithdrawalDto(withdrawal);
  },
});
