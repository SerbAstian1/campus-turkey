/**
 * Partner portal fixtures.
 *
 * These stand in for API responses and match the shapes in `types.ts` exactly, so
 * swapping `fetch` in behind them changes no screen. Two deliberate differences from
 * the prototype, both from `Developer handoff notes.md`:
 *
 *   - Money is in minor units, never a formatted string or a float. Render it through
 *     `formatMinor` from `features/portal/withdrawals.ts`.
 *   - Payout details are already masked. The full account number never exists in this
 *     file, in browser state, or in a log. See `features/portal/payouts.ts`.
 */

import type {
  PayoutOption,
  PipelineStage,
  PortalAccount,
  PortalAction,
  PortalMaterial,
  PortalStudent,
  Stat,
  Wallet,
  Withdrawal,
} from "./types";

export const account: PortalAccount = {
  org: "Bright Futures Education",
  person: "Samuel Okoro",
  role: "Country representative",
  territory: "Nigeria",
  since: "Partner since March 2023",
  manager: "Fatima Bello",
  managerRole: "Your named contact",
};

export const kpis: Stat[] = [
  { value: "38", label: "Students referred", description: "This intake cycle." },
  { value: "21", label: "Registered", description: "Confirmed by the university." },
  { value: "$4,850", label: "Available to withdraw", description: "Cleared and ready to move." },
  { value: "$3,200", label: "Awaiting payment", description: "Clears within 30 days." },
];

export const pipeline: PipelineStage[] = [
  { stage: "Enquiry", count: 9 },
  { stage: "Documents", count: 6 },
  { stage: "Submitted", count: 5 },
  { stage: "Offer", count: 4 },
  { stage: "Visa", count: 3 },
  { stage: "Registered", count: 21 },
];

export const students: PortalStudent[] = [
  { id: "st-1041", name: "Amina Yusuf", program: "Dentistry", university: "Akdeniz University", stage: "Registered", updated: "2 days ago", commissionMinor: 70000 },
  { id: "st-1042", name: "Chidi Okeke", program: "Computer Engineering", university: "Istanbul Technical University", stage: "Visa", updated: "Today", commissionMinor: 90000 },
  { id: "st-1043", name: "Blessing Adeyemi", program: "Business Administration", university: "Bilkent University", stage: "Offer", updated: "Yesterday", commissionMinor: 80000 },
  { id: "st-1044", name: "Ibrahim Musa", program: "Civil Engineering", university: "Karadeniz Technical University", stage: "Submitted", updated: "3 days ago", commissionMinor: 60000 },
  { id: "st-1045", name: "Ngozi Eze", program: "Pharmacy", university: "Ege University", stage: "Documents", updated: "5 days ago", commissionMinor: 65000 },
  { id: "st-1046", name: "Tunde Bakare", program: "Medicine", university: "Hacettepe University", stage: "Enquiry", updated: "1 week ago", commissionMinor: 90000 },
];

export const actions: PortalAction[] = [
  { icon: "file-warning", title: "Ngozi Eze is missing a transcript", body: "The university needs a sworn translation before it will assess the file.", cta: "Upload document" },
  { icon: "calendar-clock", title: "Bilkent scholarship round closes 1 May", body: "Two of your applicants qualify. Submit before the deadline to keep the rate.", cta: "Review applicants" },
  { icon: "badge-check", title: "Your agreement renews in 60 days", body: "Territory and commission terms stay the same unless you ask to change them.", cta: "Read agreement" },
];

export const withdrawals: Withdrawal[] = [
  { id: "wd-014", reference: "INV-2026-014", period: "March 2026", basis: "6 registrations", amountMinor: 410000, currency: "USD", status: "Paid", requestedAt: "2026-04-02" },
  { id: "wd-009", reference: "INV-2026-009", period: "February 2026", basis: "5 registrations", amountMinor: 330000, currency: "USD", status: "Paid", requestedAt: "2026-03-03" },
  { id: "wd-004", reference: "INV-2026-004", period: "January 2026", basis: "7 registrations", amountMinor: 400000, currency: "USD", status: "Paid", requestedAt: "2026-02-02" },
  { id: "wd-018", reference: "INV-2026-018", period: "April 2026", basis: "4 registrations", amountMinor: 320000, currency: "USD", status: "Processing", requestedAt: "2026-05-04" },
];

/** Rails on offer. `fields` describes the provider's hosted form, not ours to store. */
const payoutOptions: PayoutOption[] = [
  {
    id: "bank", icon: "landmark", label: "Bank transfer",
    blurb: "Local rails where we have them, SWIFT everywhere else.",
    regions: "Available in 140 countries", eta: "1 to 3 working days", fee: "Free over $500, otherwise $8",
    fields: [
      { label: "Account holder", icon: "user", placeholder: "As printed on the account" },
      { label: "Bank name", icon: "building", placeholder: "GTBank" },
      { label: "IBAN or account number", icon: "hash", placeholder: "NG00 0000 0000 0000" },
      { label: "SWIFT or BIC", icon: "globe", placeholder: "GTBINGLA" },
    ],
  },
  {
    id: "wise", icon: "globe", label: "Wise",
    blurb: "Mid-market rate, strong for multi-currency balances.",
    regions: "Available in 160 countries", eta: "Same working day", fee: "About 1%",
    fields: [
      { label: "Wise email or tag", icon: "mail", placeholder: "you@example.com" },
      { label: "Account holder", icon: "user", placeholder: "Full name on the Wise account" },
    ],
  },
  {
    id: "payoneer", icon: "credit-card", label: "Payoneer",
    blurb: "Common for agencies already invoicing internationally.",
    regions: "Available in 190 countries", eta: "1 working day", fee: "Up to 2%",
    fields: [
      { label: "Payoneer email", icon: "mail", placeholder: "you@example.com" },
      { label: "Customer ID", icon: "hash", placeholder: "Optional" },
    ],
  },
  {
    id: "momo", icon: "smartphone", label: "Mobile money",
    blurb: "M-Pesa, MTN MoMo, Airtel Money and Orange Money.",
    regions: "Available across Africa", eta: "Within minutes", fee: "1.5%, capped at $6",
    fields: [
      { label: "Provider", icon: "radio-tower", placeholder: "MTN MoMo" },
      { label: "Registered number", icon: "phone", placeholder: "+234 800 000 0000" },
      { label: "Account name", icon: "user", placeholder: "As registered with the provider" },
    ],
  },
  {
    id: "stablecoin", icon: "wallet", label: "Stablecoin",
    blurb: "USDC or USDT, useful where local currency moves fast.",
    regions: "Available worldwide", eta: "Within one hour", fee: "Network fee only, about $1",
    fields: [
      { label: "Token", icon: "coins", placeholder: "USDC or USDT" },
      { label: "Network", icon: "network", placeholder: "TRC20, ERC20 or Polygon" },
      { label: "Wallet address", icon: "hash", placeholder: "Paste the full address" },
    ],
  },
  {
    id: "paypal", icon: "circle-dollar-sign", label: "PayPal",
    blurb: "Fastest to set up, the most expensive to receive on.",
    regions: "Available in 200 countries", eta: "Within minutes", fee: "Up to 3.5% plus conversion",
    fields: [{ label: "PayPal email", icon: "mail", placeholder: "you@example.com" }],
  },
];

export const wallet: Wallet = {
  availableMinor: 485000,
  pendingMinor: 320000,
  lifetimeMinor: 1460000,
  minimumMinor: 20000,
  currency: "USD",
  note: "Cleared commission is available to withdraw at any time. Anything still pending clears within 30 days of the university confirming registration.",
  methods: [
    { id: "bank-ng", kind: "bank", label: "Bank transfer", maskedDetail: "GTBank •••• 4417 · Lagos", speed: "2 to 3 working days", fee: "No fee over $500", isDefault: true },
    { id: "wise-1", kind: "wise", label: "Wise", maskedDetail: "s••••@brightfutures.ng", speed: "Same working day", fee: "1% of the amount" },
    { id: "usdt-1", kind: "stablecoin", label: "Stablecoin payout", maskedDetail: "USDT TRC20 •••• 9f2c", speed: "Within one hour", fee: "$1 network fee" },
  ],
  options: payoutOptions,
};

export const materials: PortalMaterial[] = [
  { icon: "book-open", title: "University brochure pack", meta: "42 universities · PDF · 18 MB" },
  { icon: "receipt", title: "2026 tuition and fee list", meta: "Updated April 2026 · XLSX" },
  { icon: "list-checks", title: "Application document checklist", meta: "English, Arabic, French · PDF" },
  { icon: "image", title: "Social media asset pack", meta: "24 assets · ZIP · 60 MB" },
  { icon: "presentation", title: "Partner training deck", meta: "Recorded session · PDF + video" },
  { icon: "percent", title: "Commission schedule", meta: "Your rates · PDF" },
];
