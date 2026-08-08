/**
 * Become a Partner and Become a Representative.
 *
 * Commission figures are ranges and the screens label them as indicative. The binding
 * numbers live in the signed agreement, and both screens say so rather than implying
 * this page is the offer.
 */

import type { JourneyStep, Point, Representative } from "./types";

export const partnerBenefits: Point[] = [
  { icon: "percent", title: "Commission on every enrolment", body: "Paid within 30 days of the university confirming registration. Rates are published in the portal." },
  { icon: "layout-dashboard", title: "A portal that shows the truth", body: "Every student you refer, their stage, their documents and your payment status." },
  { icon: "book-open", title: "Materials in your language", body: "University brochures, price lists and application checklists in English, Arabic and French." },
  { icon: "headset", title: "A named contact", body: "One person on our side who answers you, not a shared inbox." },
];

export const representativeSteps: JourneyStep[] = [
  { meta: "Step 1", title: "Apply", description: "One short form with your company details and the country you want to cover.", icon: "file-text" },
  { meta: "Step 2", title: "Interview", description: "A 30 minute call to check territory, experience and expectations.", icon: "phone" },
  { meta: "Step 3", title: "Agreement", description: "We sign a representative agreement with clear territory and commission terms.", icon: "file-signature" },
  { meta: "Step 4", title: "Training and launch", description: "Two training sessions, your portal account and your first marketing pack.", icon: "rocket" },
];

export const representative: Representative = {
  benefits: [
    { icon: "map-pinned", title: "An exclusive territory", body: "One representative per country or region. Every enrolment from your territory is credited to you." },
    { icon: "banknote", title: "Published commission", body: "Rates are written into your agreement and paid within 30 days of registration." },
    { icon: "presentation", title: "Training and materials", body: "Two onboarding sessions, then quarterly updates on universities, fees and visa rules." },
    { icon: "megaphone", title: "Marketing support", body: "Co-branded brochures, social assets and a budget contribution for local education fairs." },
  ],
  requirements: [
    "A registered company or a licensed consultancy",
    "An office where students can meet you",
    "At least two years in education, travel or migration services",
    "One staff member who speaks English",
    "No representation agreement with a competing Türkiye agency",
  ],
  earnings: [
    ["Per bachelor enrolment", "$400 to $900", "Paid on registration"],
    ["Per master or PhD enrolment", "$500 to $1,100", "Paid on registration"],
    ["Language year placement", "$200", "Paid on registration"],
    ["Medical patient referral", "5% of treatment value", "Paid after treatment"],
    ["Annual territory bonus", "Up to $6,000", "On volume targets"],
  ],
  faq: [
    { question: "How is a territory defined?", answer: "Usually one country. Large countries are split by region, and the split is written into your agreement." },
    { question: "Is there a joining fee?", answer: "No. There is no fee to become a representative and no minimum purchase." },
    { question: "What volume do you expect?", answer: "Ten enrolments in the first year is a normal starting target. We agree it with you before signing." },
    { question: "Can I represent other destinations?", answer: "Yes, as long as you do not represent another agency for Türkiye." },
    { question: "How quickly can I start?", answer: "Most representatives are signed and trained within three weeks of applying." },
  ],
};
