/**
 * Withdrawals — the client half of a server-authoritative flow.
 *
 * Everything that matters here happens on the server. The client's job is to state
 * intent clearly and to be safe to retry. Three rules, none optional:
 *
 *   1. The balance is never client-side truth. The UI shows the last figure the server
 *      sent; the server re-checks it inside the transaction that creates the
 *      withdrawal. A partner with a stale tab must not be able to withdraw twice.
 *
 *   2. Every request carries an idempotency key, generated once when the form opens
 *      and reused across retries. A dropped response, a double tap or a flaky
 *      connection then produces one withdrawal, not two. The server stores the key
 *      with the result and replays it.
 *
 *   3. Withdrawals are requests, not transfers. They enter `Requested` and move
 *      through approval. Nothing in this file moves money.
 */

import type { Withdrawal } from "@/content/types";

export interface WithdrawalRequest {
  amountMinor: number;
  currency: string;
  payoutMethodId: string;
  /** Generated once per form session. See `newIdempotencyKey`. */
  idempotencyKey: string;
}

/** One key per form session, reused by every retry of that same intent. */
export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

export type WithdrawalResult =
  | { ok: true; withdrawal: Withdrawal }
  | { ok: false; reason: "insufficient" | "method-invalid" | "limit" | "server"; message: string };

export async function requestWithdrawal(req: WithdrawalRequest): Promise<WithdrawalResult> {
  const res = await fetch("/api/partner/withdrawals", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      /* The server keys on this. Retrying with the same value returns the original
         result rather than creating a second withdrawal. */
      "idempotency-key": req.idempotencyKey,
    },
    credentials: "include",
    body: JSON.stringify({
      amountMinor: req.amountMinor,
      currency: req.currency,
      payoutMethodId: req.payoutMethodId,
    }),
  });

  if (res.status === 409) {
    return { ok: false, reason: "insufficient", message: "Your available balance has changed. Refresh and try again." };
  }
  if (res.status === 422) {
    return { ok: false, reason: "method-invalid", message: "That payout method is no longer valid. Choose another." };
  }
  if (res.status === 429) {
    return { ok: false, reason: "limit", message: "You have reached the withdrawal limit for today." };
  }
  if (!res.ok) {
    return { ok: false, reason: "server", message: "We could not process that. Nothing has been taken from your balance." };
  }
  return { ok: true, withdrawal: (await res.json()) as Withdrawal };
}

/**
 * Human-readable status. Partners read these on a page about their own money, so the
 * wording states who is acting and what happens next, not just a state name.
 */
export const WITHDRAWAL_STATUS: Record<Withdrawal["status"], { label: string; note: string }> = {
  Requested: { label: "Requested", note: "Waiting for approval. Usually the same working day." },
  Approved: { label: "Approved", note: "Approved and queued for payment." },
  Processing: { label: "Processing", note: "Sent to your payout provider." },
  Paid: { label: "Paid", note: "Paid. Check your account." },
  Rejected: { label: "Rejected", note: "Not approved. Your named contact will explain why." },
};

/** Money formatting. Minor units in, display string out; never float arithmetic. */
export function formatMinor(minor: number, currency: string, locale = "en"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(minor / 100);
}
