/**
 * POST /api/webhooks/payouts — settlement callbacks from the payout provider
 *
 * Auth:  none in the session sense — authenticated by HMAC signature instead
 * Authz: a valid signature over `${timestamp}.${body}` using PAYOUT_WEBHOOK_SECRET.
 *        Nothing else is trusted, including the provider's own claim of who it is.
 *
 *   200  { received: true } — including for events we deliberately ignore
 *   400  malformed body
 *   401  missing, stale or mismatched signature
 *   404  the withdrawal referenced does not exist
 *   409  the transition is not valid from the current status
 *   429  rate limited (generous — providers burst on retry)
 *   503  webhooks not configured (no PAYOUT_WEBHOOK_SECRET)
 *
 * Deliberately **not** wrapped in `route()`. That wrapper enforces the same-origin
 * check, which is exactly right for a browser and exactly wrong here: a provider's
 * server sends no `Origin`, so every legitimate callback would be refused. The
 * signature does the job the origin check does elsewhere, and it does it better.
 *
 * `SYSTEM` is the actor. The state machine lets SYSTEM settle a payout (`PROCESSING →
 * PAID`) and refuses to let it approve one (`REQUESTED → APPROVED`) — so a compromised
 * webhook secret cannot be used to authorise money, only to report on money a human
 * already authorised.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { env } from "@/server/lib/config";
import { requestLogger } from "@/server/lib/logger";
import { toErrorResponse, AppError, NotFoundError } from "@/server/lib/errors";
import { enforceRateLimit, RATE_LIMITS } from "@/server/lib/ratelimit";
import { verifySignature } from "@/server/modules/webhooks/signature";
import { transitionWithdrawal } from "@/server/modules/withdrawals/withdrawals.service";
import { db } from "@/server/lib/db";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 32KB. A settlement callback is a few hundred bytes. */
const MAX_BODY_BYTES = 32 * 1024;

const eventBody = z.object({
  /** Provider event id, used to make a retry idempotent. */
  id: z.string().min(1).max(200),
  type: z.string().min(1).max(100),
  data: z.object({
    /** Our reference, echoed back — `WD-2026-000431`. */
    reference: z.string().min(1).max(100),
    providerRef: z.string().min(1).max(200).optional(),
    failureReason: z.string().max(500).optional(),
  }),
});

/**
 * Provider event types mapped onto our statuses.
 *
 * Anything not in this map is acknowledged and ignored. A provider will send events
 * this system has no opinion about, and 200-and-ignore is the correct answer — a 4xx
 * makes the provider retry forever and eventually disable the endpoint.
 */
const EVENT_STATUS: Record<string, "PROCESSING" | "PAID" | "REJECTED"> = {
  "payout.processing": "PROCESSING",
  "payout.sent": "PROCESSING",
  "payout.paid": "PAID",
  "payout.settled": "PAID",
  "payout.failed": "REJECTED",
  "payout.returned": "REJECTED",
  "payout.cancelled": "REJECTED",
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = randomUUID();
  const log = requestLogger({ requestId, route: "/api/webhooks/payouts", method: "POST" });

  try {
    if (!env.PAYOUT_WEBHOOK_SECRET) {
      // Configured-off rather than broken. 503 tells the provider to retry later
      // instead of disabling the endpoint, which a 4xx would eventually do.
      return NextResponse.json(
        { error: "Webhooks are not configured." },
        { status: 503, headers: { "retry-after": "3600" } },
      );
    }

    await enforceRateLimit(RATE_LIMITS.webhook, { request, scope: "ip" });

    // The exact bytes. Re-serialising parsed JSON changes key order and the HMAC no
    // longer matches — this is the single most common way webhook verification is
    // broken by accident.
    const rawBody = await request.text();
    if (rawBody.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Body too large." }, { status: 400 });
    }

    const verified = verifySignature({
      rawBody,
      signature: request.headers.get("x-signature"),
      timestamp: request.headers.get("x-timestamp"),
      secret: env.PAYOUT_WEBHOOK_SECRET,
    });

    if (!verified.ok) {
      // The reason goes to the log, never to the caller: telling an attacker whether
      // their signature was stale or merely wrong is free information.
      log.warn("payout webhook signature rejected", { reason: verified.reason });
      return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
    }

    const parsed = eventBody.safeParse(JSON.parse(rawBody));
    if (!parsed.success) {
      log.warn("payout webhook body failed validation");
      return NextResponse.json({ error: "Malformed event." }, { status: 400 });
    }

    const event = parsed.data;
    const status = EVENT_STATUS[event.type];

    if (!status) {
      log.info("payout webhook ignored", { type: event.type, eventId: event.id });
      return NextResponse.json({ received: true, ignored: true });
    }

    const withdrawal = await db.withdrawal.findUnique({
      where: { reference: event.data.reference },
      select: { id: true, status: true },
    });
    if (!withdrawal) throw new NotFoundError("Unknown withdrawal reference.");

    /*
     * Providers retry, and a retry must not be an error. If the withdrawal is already
     * in the state this event describes, acknowledge and stop — the alternative is a
     * 409 that makes the provider retry a settlement that already succeeded.
     */
    if (withdrawal.status === status) {
      log.info("payout webhook replayed", { eventId: event.id, status });
      return NextResponse.json({ received: true, alreadyApplied: true });
    }

    await transitionWithdrawal(
      {
        withdrawalId: withdrawal.id,
        to: status,
        // SYSTEM may settle, and may not approve. See withdrawal.state.ts.
        actor: "SYSTEM",
        actorUserId: null,
        note: event.data.failureReason ?? `Provider event ${event.type}`,
        ...(event.data.providerRef ? { providerRef: event.data.providerRef } : {}),
      },
      log,
    );

    log.audit("payout.webhook_applied", {
      eventId: event.id,
      type: event.type,
      reference: event.data.reference,
      to: status,
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    const { status, body } = toErrorResponse(error, requestId);
    if (!(error instanceof AppError)) {
      log.error("payout webhook failed", { error });
    }
    return NextResponse.json(body, { status });
  }
}
