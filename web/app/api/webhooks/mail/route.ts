/**
 * POST /api/webhooks/mail — delivery events from the mail provider
 *
 * Auth:  none in the session sense — authenticated by Svix signature instead
 * Authz: a valid `v1` signature over `${svix-id}.${svix-timestamp}.${body}` using
 *        MAIL_WEBHOOK_SECRET. Nothing else is trusted.
 *
 *   200  { received: true } — including for events this system deliberately ignores
 *   400  malformed body
 *   401  missing, stale or mismatched signature
 *   429  rate limited (generous — providers burst on retry)
 *   503  webhooks not configured (no MAIL_WEBHOOK_SECRET)
 *
 * ## Why this endpoint exists
 *
 * `sendMail` logs "mail sent" when the provider's API returns 2xx, and that means the
 * provider *accepted* the message — not that anybody received it. Everything that happens
 * after acceptance happens out of band: a hard bounce because the address does not exist,
 * a spam complaint, a deferral because the receiving server is throttling us. Without this
 * route none of it is visible from inside the application, and the first symptom of a
 * damaged sending reputation is a partner saying they never got their code.
 *
 * This matters most in the first weeks on a new sending domain, which is exactly when
 * these events carry the most information and exactly when nobody is looking for them.
 *
 * ## What it deliberately does not do
 *
 * It does not write to the database and it does not suppress future sends. A suppression
 * list is a real feature with real failure modes — an address wrongly suppressed can never
 * sign in again, and the provider already maintains its own — so it is not something to
 * add as a side effect of adding observability. What this gives you is the signal, at a
 * severity Sentry will surface. Persisting it is a deliberate follow-up, not an omission.
 *
 * Like the payouts webhook, this is **not** wrapped in `route()`: that wrapper enforces a
 * same-origin check, and a provider's server sends no `Origin`. The signature does that
 * job here, and does it better.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { env } from "@/server/lib/config";
import { requestLogger } from "@/server/lib/logger";
import { toErrorResponse } from "@/server/lib/errors";
import { enforceRateLimit, RATE_LIMITS } from "@/server/lib/ratelimit";
import { verifySvixSignature } from "@/server/modules/webhooks/signature";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 64KB. A delivery event is a few hundred bytes; the ceiling is for the malformed case. */
const MAX_BODY_BYTES = 64 * 1024;

/**
 * Only the fields this route reads, and all of them optional past the type.
 *
 * A provider adds fields to its event payloads without warning, and a strict schema here
 * would turn a harmless addition into a 400 and then into a disabled endpoint. `passthrough`
 * keeps the unknown parts rather than erroring on them.
 */
const eventBody = z
  .object({
    type: z.string().min(1).max(100),
    created_at: z.string().max(64).optional(),
    data: z
      .object({
        email_id: z.string().max(200).optional(),
        subject: z.string().max(500).optional(),
        to: z.union([z.string(), z.array(z.string())]).optional(),
        bounce: z
          .object({ type: z.string().max(100).optional(), message: z.string().max(500).optional() })
          .partial()
          .optional(),
      })
      .passthrough(),
  })
  .passthrough();

/**
 * How loudly each event is reported.
 *
 * `error` is reserved for the two that mean a person did not get their mail and will not
 * get it on a retry — those are the ones worth waking Sentry for. A deferral is normal and
 * usually resolves itself, so it is a warning. Acceptance and delivery are `info`: useful
 * when reconstructing what happened, not worth an alert.
 *
 * Anything absent from this map is acknowledged and ignored. Providers send events this
 * system has no opinion about (opens, clicks), and 200-and-ignore is the correct answer —
 * a 4xx makes the provider retry and eventually disable the endpoint.
 */
const EVENT_SEVERITY: Record<string, "error" | "warn" | "info"> = {
  "email.bounced": "error",
  "email.complained": "error",
  "email.delivery_delayed": "warn",
  "email.delivered": "info",
  "email.sent": "info",
};

/** Recipients arrive as a string or an array depending on the event. One shape out. */
function recipients(to: string | string[] | undefined): string[] {
  if (!to) return [];
  return Array.isArray(to) ? to : [to];
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = randomUUID();
  const log = requestLogger({ requestId, route: "/api/webhooks/mail", method: "POST" });

  try {
    if (!env.MAIL_WEBHOOK_SECRET) {
      // Configured-off rather than broken. 503 tells the provider to retry later instead
      // of disabling the endpoint, which a sustained 4xx would eventually do.
      return NextResponse.json(
        { error: "Webhooks are not configured." },
        { status: 503, headers: { "retry-after": "3600" } },
      );
    }

    await enforceRateLimit(RATE_LIMITS.webhook, { request, scope: "ip" });

    // The exact bytes. Re-serialising parsed JSON changes key order and the HMAC no
    // longer matches — the single most common way webhook verification breaks by accident.
    const rawBody = await request.text();
    if (rawBody.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Body too large." }, { status: 400 });
    }

    const verified = verifySvixSignature({
      rawBody,
      id: request.headers.get("svix-id"),
      timestamp: request.headers.get("svix-timestamp"),
      signature: request.headers.get("svix-signature"),
      secret: env.MAIL_WEBHOOK_SECRET,
    });

    if (!verified.ok) {
      // The reason goes to the log, never to the caller: telling an attacker whether their
      // signature was stale or merely wrong is free information.
      log.warn("mail webhook signature rejected", { reason: verified.reason });
      return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      log.warn("mail webhook body was not JSON");
      return NextResponse.json({ error: "Malformed event." }, { status: 400 });
    }

    const parsed = eventBody.safeParse(body);
    if (!parsed.success) {
      log.warn("mail webhook body failed validation");
      return NextResponse.json({ error: "Malformed event." }, { status: 400 });
    }

    const event = parsed.data;
    const severity = EVENT_SEVERITY[event.type];

    if (!severity) {
      log.info("mail webhook ignored", { type: event.type });
      return NextResponse.json({ received: true, ignored: true });
    }

    /*
     * The recipient is logged, and that is a deliberate call rather than an oversight.
     *
     * A bounce report naming no address cannot be acted on — the whole operational value
     * is knowing *which* mailbox is dead. `sendMail` already logs `to` for the same reason,
     * so this is consistent with the existing posture rather than a new disclosure. The
     * message body is never included; that is where a code would be.
     */
    const detail = {
      type: event.type,
      emailId: event.data.email_id,
      to: recipients(event.data.to),
      bounceType: event.data.bounce?.type,
      reason: event.data.bounce?.message,
    };

    if (severity === "error") {
      log.error("mail delivery failed", detail);
    } else if (severity === "warn") {
      log.warn("mail delivery delayed", detail);
    } else {
      log.info("mail delivery event", detail);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const { status, body, headers } = toErrorResponse(error, requestId);
    return NextResponse.json(body, {
      status,
      headers: { ...headers, "x-request-id": requestId, "cache-control": "no-store" },
    });
  }
}
