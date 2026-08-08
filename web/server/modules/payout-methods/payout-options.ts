/**
 * The payout rails on offer.
 *
 * Static content, not data. A rail is added by editing this file, not by inserting a
 * row — there are four of them, they change roughly never, and a table would add a
 * query to the wallet path for no benefit.
 *
 * The shape is `PayoutOption` from the frontend contract, so the portal's picker
 * renders these without a mapper.
 *
 * The `fields` on each option describe what the *provider's* hosted form collects.
 * They are rendered as labels so a partner knows what to have to hand; the values are
 * never posted to this server. See features/portal/payouts.ts for why.
 */

import type { PayoutOption } from "@contracts/types";

export const PAYOUT_OPTIONS: PayoutOption[] = [
  {
    id: "bank",
    icon: "landmark",
    label: "Bank transfer",
    blurb: "Paid into a local or international account in your own name.",
    regions: "Most countries",
    eta: "2–5 working days",
    fee: "From 1.2%",
    fields: [
      { label: "Account holder", icon: "user", placeholder: "As it appears on the account" },
      { label: "IBAN or account number", icon: "hash", placeholder: "Collected by our payment provider" },
      { label: "SWIFT / BIC", icon: "globe", placeholder: "For international transfers" },
    ],
  },
  {
    id: "mobile-money",
    icon: "smartphone",
    label: "Mobile money",
    blurb: "Paid to a mobile wallet. Usually the fastest option across Africa.",
    regions: "West, East and Central Africa",
    eta: "Same day",
    fee: "From 1.5%",
    fields: [
      { label: "Registered name", icon: "user", placeholder: "As registered with your operator" },
      { label: "Mobile number", icon: "phone", placeholder: "Collected by our payment provider" },
    ],
  },
  {
    id: "wise",
    icon: "send",
    label: "Wise",
    blurb: "Paid into a Wise multi-currency balance you already hold.",
    regions: "Wise-supported countries",
    eta: "1–2 working days",
    fee: "From 0.9%",
    fields: [
      { label: "Wise account email", icon: "mail", placeholder: "Collected by our payment provider" },
    ],
  },
  {
    id: "stablecoin",
    icon: "coins",
    label: "Stablecoin",
    blurb: "Paid in USDC or USDT. Available where local banking is slow.",
    regions: "Selected countries",
    eta: "Within the hour",
    fee: "Network fee only",
    fields: [
      { label: "Network", icon: "network", placeholder: "Chosen with our payment provider" },
      { label: "Wallet address", icon: "wallet", placeholder: "Collected by our payment provider" },
    ],
  },
];
