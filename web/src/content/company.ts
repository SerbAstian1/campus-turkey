/**
 * About and Contact. Offices, history, the people who sign things and the credentials
 * we claim — each of which is checkable, which is the only reason to list them.
 */

import type { ContactDetails, Leader, Milestone, Office } from "./types";

export const offices: Office[] = [
  { city: "Istanbul", role: "Head office", address: "Şişli, Istanbul, Türkiye", phone: "+90 555 000 0000" },
  { city: "Ankara", role: "University liaison", address: "Çankaya, Ankara, Türkiye", phone: "+90 555 000 0001" },
  { city: "Lagos", role: "West Africa representative", address: "Ikeja, Lagos, Nigeria", phone: "+234 800 000 0000" },
];

export const milestones: Milestone[] = [
  { meta: "2014", title: "Campus Turkey opens in Istanbul", description: "Two founders, one office in Şişli and a handful of university agreements.", icon: "flag" },
  { meta: "2017", title: "First 1,000 students placed", description: "Agreements with 40 universities and the first country representative in Lagos.", icon: "users" },
  { meta: "2020", title: "Medical and business desks open", description: "Families asked for treatment and trade support, so we built both properly.", icon: "heart-pulse" },
  { meta: "2023", title: "Partner portal launches", description: "Agencies can track every referral, document and payment themselves.", icon: "layout-dashboard" },
  { meta: "2026", title: "200+ university agreements", description: "Representatives in 14 countries and six languages of support.", icon: "landmark" },
];

export const leadership: Leader[] = [
  { name: "Mehmet Aydın", role: "Founder and managing director", note: "Twelve years placing international students in Turkish universities." },
  { name: "Fatima Bello", role: "Head of admissions", note: "Leads the team that prepares and files every application." },
  { name: "Dr. Elif Kaya", role: "Medical services director", note: "Coordinates hospital partnerships and patient files." },
  { name: "Samuel Okoro", role: "Partnerships director", note: "Looks after agencies and country representatives." },
];

export const accreditations: string[] = [
  "Registered education consultancy, Istanbul",
  "Member, Turkish Education Consultants Association",
  "Authorised representative for 200+ universities",
  "JCI accredited hospital partners only",
  "Registered tour operator licence",
  "GDPR aligned data handling",
];

export const contact: ContactDetails = {
  address: "Şişli, Istanbul, Türkiye",
  phone: "+90 555 000 0000",
  email: "hello@campusturkey.com",
  whatsapp: "WhatsApp us",
};
