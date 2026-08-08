/**
 * Content contracts.
 *
 * Every screen reads from these types, never from loose objects. When a CMS or an API
 * replaces the static content, only the loaders in `content/*.ts` change — the screens
 * keep compiling against the same shapes.
 *
 * These are also the contracts that cross into the backend. Declare them once here and
 * import them server-side; do not restate them.
 */

/* ---------------------------------------------------------------- primitives */

/** A headline number with its caption. Used on nearly every screen. */
export interface Stat {
  value: string;
  label: string;
  description?: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

/** An icon-led feature or benefit tile. */
export interface Point {
  icon: string;
  title: string;
  body: string;
}

/** One numbered step in any process strip. */
export interface JourneyStep {
  meta: string;
  title: string;
  description: string;
  icon: string;
}

/** An internal destination. Router paths, not the prototype's hash routes. */
export interface NavLink {
  label: string;
  to: string;
}

/* --------------------------------------------------------------- universities */

export type UniversityType = "Public" | "Private";

export interface University {
  slug: string;
  name: string;
  city: string;
  type: UniversityType;
  /** Languages of instruction, e.g. ["English", "Turkish"]. */
  languages: string[];
  /** Display string, not a number: currency and cadence matter to the reader. */
  tuition: string;
  programs: number;
  scholarship?: boolean;
  founded: number;
  /** Display string, e.g. "38,000". */
  students: string;
  ranking: string;
  about: string;
  faculties: string[];
  /** [label, value] pairs, in intake order. */
  deadlines: [string, string][];
  lat: number;
  lng: number;
}

/* -------------------------------------------------------------------- services */

/** What a package covers, and what it pointedly does not. */
export interface ServiceIncludes {
  title: string;
  items: string[];
}

/** An indicative price line. Never a booking figure — every screen says so. */
export interface ServicePrice {
  item: string;
  price: string;
  note: string;
}

export interface Service {
  slug: string;
  icon: string;
  title: string;
  eyebrow: string;
  lead: string;
  points: Point[];
  /** Sector or treatment chips. */
  tags: string[];
  stats: Stat[];
  steps: JourneyStep[];
  includes: ServiceIncludes[];
  pricing: ServicePrice[];
  /** Short reassurance lines, rendered as a checklist. */
  trust: string[];
  faq: FaqItem[];
  cta: string;
}

/** The homepage's service card — a teaser, not the full service record. */
export interface ServiceCard {
  icon: string;
  title: string;
  description: string;
  /** Prototype route name, without the leading `#/`. */
  route: string;
  ctaLabel: string;
  badge?: string;
  emphasis?: "primary";
  points?: string[];
}

/* ---------------------------------------------------------------- institutions */

export interface Institution {
  slug: string;
  icon: string;
  eyebrow: string;
  title: string;
  lead: string;
  points: Point[];
  stats: Stat[];
  list: string[];
  cta: string;
}

/* --------------------------------------------------------------------- content */

export interface ArticleSection {
  heading: string;
  paragraphs: string[];
}

export interface Article {
  slug: string;
  tag: "Guide" | "Checklist" | "Explainer";
  title: string;
  body: string;
  /** Display string, e.g. "8 min". */
  read: string;
  date: string;
  author: string;
  sections: ArticleSection[];
}

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  country: string;
  video?: boolean;
  duration?: string;
}

/* ----------------------------------------------------------------- study hub */

export interface Scholarship {
  name: string;
  who: string;
  covers: string;
  when: string;
  /** Plain-language odds. The prototype refuses to imply a guarantee. */
  competitive: string;
}

/* ------------------------------------------------------------------- company */

export interface Office {
  city: string;
  role: string;
  address: string;
  phone: string;
}

export interface Milestone {
  meta: string;
  title: string;
  description: string;
  icon: string;
}

export interface Leader {
  name: string;
  role: string;
  note: string;
}

export interface ContactDetails {
  address: string;
  phone: string;
  email: string;
  whatsapp: string;
}

/* ------------------------------------------------------------------ partners */

export interface Representative {
  benefits: Point[];
  requirements: string[];
  /** [what, how much, when paid] */
  earnings: [string, string, string][];
  faq: FaqItem[];
}

/* -------------------------------------------------------------------- portal */

/** Portal records. These become API responses; the shapes are the contract. */
export interface PortalStudent {
  id: string;
  name: string;
  university: string;
  program: string;
  stage: "Enquiry" | "Documents" | "Submitted" | "Offer" | "Visa" | "Registered";
  updated: string;
  /** Minor units, to avoid floating point on money. */
  commissionMinor: number;
}

export interface PortalAccount {
  org: string;
  person: string;
  role: string;
  territory: string;
  since: string;
  manager: string;
  managerRole: string;
}

export interface PipelineStage {
  stage: PortalStudent["stage"];
  count: number;
}

export interface PortalAction {
  icon: string;
  title: string;
  body: string;
  cta: string;
}

export interface PortalMaterial {
  icon: string;
  title: string;
  meta: string;
}

export interface PayoutMethod {
  id: string;
  kind: "bank" | "wise" | "stablecoin" | "mobile-money";
  label: string;
  /** Already masked by the provider. Never hold full account details client-side. */
  maskedDetail: string;
  speed: string;
  fee: string;
  isDefault?: boolean;
}

/** One field the partner fills when adding a payout method. */
export interface PayoutField {
  label: string;
  icon: string;
  placeholder: string;
}

/** A payout rail on offer, before the partner has connected it. */
export interface PayoutOption {
  id: string;
  icon: string;
  label: string;
  blurb: string;
  regions: string;
  eta: string;
  fee: string;
  fields: PayoutField[];
}

export interface Wallet {
  /** Minor units. See features/portal/withdrawals.ts for why. */
  availableMinor: number;
  pendingMinor: number;
  lifetimeMinor: number;
  minimumMinor: number;
  currency: string;
  note: string;
  methods: PayoutMethod[];
  options: PayoutOption[];
}

export interface Withdrawal {
  id: string;
  reference: string;
  period: string;
  basis: string;
  amountMinor: number;
  currency: string;
  status: "Requested" | "Approved" | "Processing" | "Paid" | "Rejected";
  requestedAt: string;
}
