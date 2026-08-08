/**
 * POST /api/partner/withdrawals — request a withdrawal
 * GET  /api/partner/withdrawals — list this partner's withdrawals
 *
 * Auth:  required (session with a partner record)
 * Authz: scoped to `session.partner.id`. A partner id is never read from the request.
 *
 * POST responses
 *   200  Withdrawal — created, or the original when the idempotency key replays
 *   400  validation failed (amount not an integer, bad currency, malformed uuid)
 *   400  missing or malformed `idempotency-key` header
 *   401  no session
 *   403  session is not a partner, or the origin check failed
 *   403  partner is suspended or closed
 *   409  insufficient balance — the client renders "your balance has changed"
 *   409  balance under review (overdrawn — an incident, not a user error)
 *   422  payout method invalid, archived, or not this partner's
 *   422  amount below the partner's minimum
 *   422  currency does not match the partner's
 *   429  rate limited — 10/hour per user, with Retry-After
 *   500  unexpected — nothing written, nothing taken from the balance
 *
 * GET responses
 *   200  { items: Withdrawal[], nextCursor: string | null }
 *   401  no session
 *   403  session is not a partner
 *   429  rate limited
 */

import { type NextRequest } from "next/server";
import { route } from "@/server/http/handler";
import { requirePartner } from "@/server/http/session";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { ValidationError } from "@/server/lib/errors";
import {
  requestWithdrawalBody,
  listWithdrawalsQuery,
  idempotencyKeyHeader,
} from "@/server/modules/withdrawals/withdrawals.schema";
import {
  requestWithdrawal,
  listWithdrawals,
} from "@/server/modules/withdrawals/withdrawals.service";
import { db } from "@/server/lib/db";
import { toWithdrawalDto } from "@/server/types/api";

/** The Node runtime, not Edge: Prisma's query engine needs it. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route({
  access: { kind: "partner" },
  rateLimit: RATE_LIMITS.withdrawals,
  body: requestWithdrawalBody,
  handler: async ({ body, session, request, log }) => {
    const partner = requirePartner(session);

    // The header is a trust boundary like any other. A caller who omits it is refused
    // rather than defaulted — generating a key server-side would make every retry a
    // new request, which is exactly the bug the key exists to prevent.
    const raw = (request as NextRequest).headers.get("idempotency-key");
    const parsed = idempotencyKeyHeader.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError({
        "idempotency-key": ["A valid idempotency key header is required."],
      });
    }

    const { withdrawal, replayed } = await requestWithdrawal(
      {
        partnerId: partner.id,
        payoutMethodId: body.payoutMethodId,
        amountMinor: body.amountMinor,
        currency: body.currency,
        idempotencyKey: parsed.data,
      },
      log,
    );

    if (replayed) {
      log.info("idempotent replay served", { withdrawalId: withdrawal.id });
    }

    // The client expects a bare `Withdrawal`, not an envelope — see `requestWithdrawal`
    // in features/portal/withdrawals.ts, which does `await res.json() as Withdrawal`.
    return toWithdrawalDto(withdrawal);
  },
});

export const GET = route({
  access: { kind: "partner" },
  rateLimit: RATE_LIMITS.partnerRead,
  query: listWithdrawalsQuery,
  handler: async ({ query, session }) => {
    const partner = requirePartner(session);
    const { items, nextCursor } = await listWithdrawals(db, partner.id, {
      limit: query.limit,
      ...(query.cursor ? { cursor: query.cursor } : {}),
    });

    return { items: items.map(toWithdrawalDto), nextCursor };
  },
});
