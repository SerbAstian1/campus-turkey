"use client";

/**
 * Payout methods — vaulted with the provider, never stored by us.
 *
 * The prototype held bank and wallet details in browser state, which is correct for a
 * prototype and a liability in production. An IBAN, a card, a crypto address: none of
 * these should ever reach your database or your logs.
 *
 * The model:
 *
 *   1. Ask your payment provider for a short-lived setup token, server-side.
 *   2. Collect the details in the PROVIDER'S hosted field or SDK. They never touch your
 *      JavaScript, so your form is out of scope for the sensitive-data audit.
 *   3. Store only what the provider hands back: an opaque id and a masked label.
 *
 * What you keep is `PayoutMethod` in content/types.ts — id, kind, masked detail. That
 * is enough to render the list and enough to make a payout, and it is not enough to be
 * worth stealing.
 */

import type { PayoutMethod } from "@/content/types";

/** Providers worth shortlisting, by where the partner actually is. */
export const PROVIDER_NOTES = {
  bank: "Wise Platform or Airwallex for cross-border bank payouts. Both vault the account and return a token.",
  "mobile-money": "Flutterwave or Paystack cover mobile money across West and East Africa, which is where most partners are.",
  wise: "Wise for partners who already hold a multi-currency balance.",
  stablecoin: "Circle or BVNK if you offer stablecoin payout. Treat the wallet address as vaulted like any other instrument.",
} as const;

/** Step 1: a short-lived token, minted server-side. Never mint this in the browser. */
export async function createSetupToken(kind: PayoutMethod["kind"]): Promise<{ token: string; expiresAt: string }> {
  const res = await fetch("/api/partner/payout-methods/setup-token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ kind }),
  });
  if (!res.ok) throw new Error("Could not start adding a payout method.");
  return res.json() as Promise<{ token: string; expiresAt: string }>;
}

/**
 * Step 3: confirm. The provider's SDK returns a reference after it has taken the
 * details; we exchange that for a stored method. Note what is absent from this
 * signature: no account number, no IBAN, no address.
 */
export async function confirmPayoutMethod(providerRef: string): Promise<PayoutMethod> {
  const res = await fetch("/api/partner/payout-methods", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ providerRef }),
  });
  if (!res.ok) throw new Error("Could not save that payout method.");
  return res.json() as Promise<PayoutMethod>;
}

export async function listPayoutMethods(): Promise<PayoutMethod[]> {
  const res = await fetch("/api/partner/payout-methods", { credentials: "include" });
  if (!res.ok) return [];
  return res.json() as Promise<PayoutMethod[]>;
}

export async function removePayoutMethod(id: string): Promise<boolean> {
  const res = await fetch(`/api/partner/payout-methods/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  return res.ok;
}

/**
 * Defensive mask. The provider should already return a masked label, but a display
 * layer that assumes it will is one provider change away from printing an account
 * number on screen.
 */
export function maskDetail(value: string): string {
  const trimmed = value.replace(/\s+/g, "");
  if (trimmed.length <= 4) return "••••";
  return `•••• ${trimmed.slice(-4)}`;
}
