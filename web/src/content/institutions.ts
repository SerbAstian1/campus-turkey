/**
 * The four B2B landing pages, at `/institutions/:slug`. Same shape, different audience:
 * each one names what that partner gets and what we hold ourselves to.
 */

import type { Institution } from "./types";

export const institutions: Institution[] = [
  {
    slug: "universities",
    icon: "landmark",
    eyebrow: "For institutions",
    title: "For universities",
    lead: "We recruit qualified, document-ready international students for Turkish universities, and we do not send you files that will fail at registration.",
    points: [
      { icon: "user-check", title: "Pre-screened applicants", body: "Grades, documents and language level checked against your admission rules before submission." },
      { icon: "globe", title: "Reach in 14 countries", body: "Offices and representatives across Africa, the Middle East and South Asia." },
      { icon: "line-chart", title: "Intake reporting", body: "Monthly pipeline reports so your office can forecast enrolment, not guess it." },
    ],
    stats: [
      { value: "200+", label: "Partner universities" },
      { value: "94%", label: "Registration rate", description: "Of students we submit." },
      { value: "14", label: "Source countries" },
      { value: "2 weeks", label: "Agreement turnaround" },
    ],
    list: [
      "Recruitment agreement with clear commission terms",
      "Document pre-screening against your rules",
      "Turkish and English language placement",
      "Open day and campus tour hosting",
      "Country-level marketing campaigns",
      "Monthly pipeline and conversion reporting",
    ],
    cta: "Talk to our institutions team",
  },
  {
    slug: "agencies",
    icon: "users",
    eyebrow: "For institutions",
    title: "For agencies and consultants",
    lead: "You already have the students. We handle admission, visa and arrival in Türkiye, and pay commission on published rates within 30 days of registration.",
    points: [
      { icon: "percent", title: "Published commission", body: "Rates are in your portal in writing, not negotiated per student. Paid within 30 days of the university confirming registration." },
      { icon: "layout-dashboard", title: "A portal that shows the truth", body: "Every student you refer, the stage they are at, which document is missing and what you are owed." },
      { icon: "headset", title: "A named contact", body: "One person on our side who answers you, not a shared inbox and not a ticket number." },
    ],
    stats: [
      { value: "30 days", label: "Commission payout", description: "After registration is confirmed." },
      { value: "48h", label: "Reply time", description: "On WhatsApp, every working day." },
      { value: "3", label: "Languages of materials", description: "English, Arabic and French." },
      { value: "0", label: "Joining fee" },
    ],
    list: [
      "Recruitment agreement with published commission rates",
      "Partner portal with live student stages and payment status",
      "University brochures and price lists in three languages",
      "Document checklists that match each university's rules",
      "Visa and arrival handled entirely on our side",
      "Two training sessions and a marketing pack at launch",
    ],
    cta: "Become a partner",
  },
  {
    slug: "hospitals",
    icon: "hospital",
    eyebrow: "For institutions",
    title: "For hospitals and clinics",
    lead: "International patients arrive prepared, insured and expected. We handle the coordination your international office does not have time for.",
    points: [
      { icon: "clipboard-check", title: "Complete patient files", body: "Reports, translations and history sent before the patient books a flight." },
      { icon: "languages", title: "Translation on site", body: "Our translators attend appointments so your staff are not interpreting." },
      { icon: "calendar-check", title: "Predictable scheduling", body: "Arrival dates, length of stay and follow-ups are confirmed in advance." },
    ],
    stats: [
      { value: "18", label: "Partner hospitals" },
      { value: "40+", label: "Procedures coordinated" },
      { value: "72h", label: "File turnaround" },
      { value: "3", label: "Cities covered" },
    ],
    list: [
      "Patient acquisition in 14 countries",
      "Pre-arrival file preparation and translation",
      "Invitation letters and visa support",
      "Accommodation and transfer coordination",
      "On-site translation at appointments",
      "Three-month remote aftercare follow-up",
    ],
    cta: "Partner with us",
  },
  {
    slug: "chambers",
    icon: "building-2",
    eyebrow: "For institutions",
    title: "For chambers of commerce",
    lead: "Trade missions that produce meetings, not sightseeing. We build the programme, verify the counterparties and travel with your delegation.",
    points: [
      { icon: "search-check", title: "Verified counterparties", body: "Every company on the schedule is checked for registration, capacity and export history." },
      { icon: "route", title: "Programme design", body: "Sector-matched meetings, factory visits and fair attendance in one itinerary." },
      { icon: "file-text", title: "Mission report", body: "Attendance, meeting notes and collected quotations for your members." },
    ],
    stats: [
      { value: "60+", label: "Delegations hosted" },
      { value: "900+", label: "Verified suppliers" },
      { value: "12", label: "Sectors" },
      { value: "4 weeks", label: "Lead time" },
    ],
    list: [
      "Delegation programme design",
      "Counterparty verification",
      "Invitation letters for the group visa file",
      "Interpreters and coordinators throughout",
      "Trade fair access and stand support",
      "Written mission report for members",
    ],
    cta: "Plan a trade mission",
  },
];

export const getInstitution = (slug: string): Institution | undefined =>
  institutions.find((i) => i.slug === slug);
