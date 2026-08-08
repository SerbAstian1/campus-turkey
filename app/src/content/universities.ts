/**
 * The university directory — 40 institutions across 25 Turkish cities.
 *
 * Nine records are written out in full because the directory and the detail screen both
 * show them first. The remaining thirty-one carry the fields that actually differ
 * (name, city, type, tuition, coordinates) and derive the rest from their index, which
 * is what the prototype does at `site/data.js`. Derived values are placeholders with a
 * realistic shape, not claims: replace this module with the CMS loader and the screens
 * do not change.
 */

import type { University, UniversityType } from "./types";

/**
 * The prototype's slug rule, character for character.
 *
 * Note what it does to Turkish letters: they are not in `a-z`, so `Boğaziçi University`
 * becomes `bo-azi-i-university` rather than `bogazici-university`. That is a genuine
 * flaw — but these slugs are the addresses the prototype publishes, and matching it is
 * the requirement. Changing the rule silently breaks every link already shared.
 *
 * To improve it later, transliterate before the a-z filter (ğ→g, ü→u, ş→s, ı→i, ö→o,
 * ç→c) and redirect the old slugs to the new ones rather than swapping them outright.
 */
export const slugify = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

interface Seed {
  name: string;
  city: string;
  type: UniversityType;
  tuition: string;
  lat: number;
  lng: number;
  scholarship?: boolean;
  languages?: string[];
  programs?: number;
  founded?: number;
  students?: string;
  ranking?: string;
  about?: string;
  faculties?: string[];
  deadlines?: [string, string][];
}

const DEFAULT_FACULTIES = ["Engineering", "Business", "Medicine", "Social Sciences", "Education"];

const DEFAULT_DEADLINES: [string, string][] = [
  ["Autumn 2026 application", "Closes July 2026"],
  ["Placement results", "August 2026"],
  ["Registration", "September 2026"],
];

/* Index-derived so the directory has plausible spread without inventing per-university
   claims. The arithmetic mirrors the prototype exactly. */
const mk = (i: number, s: Seed): University => ({
  slug: slugify(s.name),
  name: s.name,
  city: s.city,
  type: s.type,
  tuition: s.tuition,
  lat: s.lat,
  lng: s.lng,
  ...(s.scholarship ? { scholarship: true } : {}),
  languages: s.languages ?? (s.type === "Private" ? ["English"] : ["Turkish", "English"]),
  programs: s.programs ?? 40 + ((i * 17) % 90),
  students: s.students ?? `${8 + ((i * 7) % 60)},000`,
  founded: s.founded ?? 1950 + ((i * 13) % 55),
  ranking:
    s.ranking ??
    (s.type === "Private" ? "Well ranked private university" : "Established public university"),
  about:
    s.about ??
    `A ${s.type.toLowerCase()} university in ${s.city}. We place students here every intake and can confirm current tuition, scholarship room and deadlines before you apply.`,
  faculties: s.faculties ?? DEFAULT_FACULTIES,
  deadlines: s.deadlines ?? DEFAULT_DEADLINES,
});

/* The nine the directory leads with. Every field is written out. */
const FEATURED: Seed[] = [
  {
    name: "Istanbul Technical University", city: "Istanbul", type: "Public",
    languages: ["English", "Turkish"], tuition: "$1,100 / year", programs: 142, scholarship: true,
    founded: 1773, students: "38,000", ranking: "Top 5 in Türkiye for engineering",
    lat: 41.1055, lng: 29.0245,
    about: "One of the oldest technical universities in the world. Strong in engineering, architecture and naval sciences, with a large international student body.",
    faculties: ["Civil Engineering", "Computer and Informatics", "Architecture", "Naval Architecture", "Management"],
    deadlines: [["Autumn 2026 application", "Closes 30 June 2026"], ["Document submission", "Within 10 days of offer"], ["Tuition first instalment", "August 2026"]],
  },
  {
    name: "Middle East Technical University", city: "Ankara", type: "Public",
    languages: ["English"], tuition: "$1,400 / year", programs: 118, scholarship: true,
    founded: 1956, students: "27,000", ranking: "Highest ranked public university in Türkiye",
    lat: 39.891, lng: 32.783,
    about: "Taught fully in English. A research campus in Ankara with a large forest campus and strong graduate employment.",
    faculties: ["Electrical Engineering", "Economics", "Physics", "Industrial Design", "Computer Engineering"],
    deadlines: [["Autumn 2026 application", "Closes 15 June 2026"], ["Entrance exam result", "July 2026"], ["Registration", "September 2026"]],
  },
  {
    name: "Bilkent University", city: "Ankara", type: "Private",
    languages: ["English"], tuition: "$9,400 / year", programs: 78,
    founded: 1984, students: "13,000", ranking: "First private university in Türkiye",
    lat: 39.868, lng: 32.749,
    about: "A compact English-language campus with scholarships for strong applicants and a well known music and performing arts faculty.",
    faculties: ["Business Administration", "Law", "Music and Performing Arts", "Engineering", "Humanities"],
    deadlines: [["Scholarship round", "Closes 1 May 2026"], ["General application", "Closes 15 July 2026"], ["Registration", "September 2026"]],
  },
  {
    name: "Ege University", city: "Izmir", type: "Public",
    languages: ["Turkish"], tuition: "$800 / year", programs: 96,
    founded: 1955, students: "60,000", ranking: "Leading university on the Aegean coast",
    lat: 38.457, lng: 27.213,
    about: "A large public university in Izmir. Most programs are taught in Turkish, so we arrange a preparatory language year when you need one.",
    faculties: ["Medicine", "Agriculture", "Pharmacy", "Communication", "Science"],
    deadlines: [["Autumn 2026 application", "Closes 10 July 2026"], ["Language year placement", "August 2026"], ["Registration", "September 2026"]],
  },
  {
    name: "Koç University", city: "Istanbul", type: "Private",
    languages: ["English"], tuition: "$21,000 / year", programs: 64, scholarship: true,
    founded: 1993, students: "7,000", ranking: "Top private university in Türkiye",
    lat: 41.204, lng: 29.06,
    about: "A small selective campus above the Bosphorus. Generous merit scholarships, strong medicine and business schools.",
    faculties: ["Medicine", "Business", "Law", "Engineering", "Social Sciences"],
    deadlines: [["Early scholarship round", "Closes 15 March 2026"], ["Regular round", "Closes 30 May 2026"], ["Registration", "August 2026"]],
  },
  {
    name: "Akdeniz University", city: "Antalya", type: "Public",
    languages: ["Turkish", "English"], tuition: "$750 / year", programs: 88,
    founded: 1982, students: "70,000", ranking: "Largest university on the Mediterranean coast",
    lat: 36.897, lng: 30.653,
    about: "Antalya campus, low living costs and a strong medical faculty. A common choice for students who want warm weather and low tuition.",
    faculties: ["Medicine", "Tourism", "Fine Arts", "Agriculture", "Engineering"],
    deadlines: [["Autumn 2026 application", "Closes 20 July 2026"], ["Placement results", "August 2026"], ["Registration", "September 2026"]],
  },
  {
    name: "Sabancı University", city: "Istanbul", type: "Private",
    languages: ["English"], tuition: "$18,500 / year", programs: 42, scholarship: true,
    founded: 1994, students: "5,500", ranking: "Top 10 in Türkiye for research output",
    lat: 40.891, lng: 29.379,
    about: "You choose your major at the end of the first year. English language campus with a strong engineering and management focus.",
    faculties: ["Engineering and Natural Sciences", "Management", "Arts and Social Sciences"],
    deadlines: [["Scholarship round", "Closes 1 April 2026"], ["General application", "Closes 1 July 2026"], ["Registration", "September 2026"]],
  },
  {
    name: "Çukurova University", city: "Adana", type: "Public",
    languages: ["Turkish"], tuition: "$620 / year", programs: 74,
    founded: 1973, students: "45,000", ranking: "Regional leader in agriculture and medicine",
    lat: 37.058, lng: 35.362,
    about: "One of the lowest tuition options in the directory, with a large teaching hospital in Adana.",
    faculties: ["Medicine", "Agriculture", "Engineering", "Education", "Law"],
    deadlines: [["Autumn 2026 application", "Closes 25 July 2026"], ["Placement results", "August 2026"], ["Registration", "September 2026"]],
  },
  {
    name: "Karadeniz Technical University", city: "Trabzon", type: "Public",
    languages: ["Turkish"], tuition: "$700 / year", programs: 81,
    founded: 1955, students: "50,000", ranking: "The main university of the Black Sea region",
    lat: 40.999, lng: 39.777,
    about: "Trabzon campus on the Black Sea coast. Low cost of living and a large engineering faculty.",
    faculties: ["Engineering", "Medicine", "Marine Sciences", "Forestry", "Economics"],
    deadlines: [["Autumn 2026 application", "Closes 30 July 2026"], ["Placement results", "August 2026"], ["Registration", "September 2026"]],
  },
];

/* The rest of the directory. Only what differs. */
const REST: Seed[] = [
  { name: "Boğaziçi University", city: "Istanbul", type: "Public", tuition: "$1,300 / year", scholarship: true, languages: ["English"], ranking: "One of the most selective universities in Türkiye", lat: 41.085, lng: 29.051 },
  { name: "Istanbul University", city: "Istanbul", type: "Public", tuition: "$900 / year", lat: 41.012, lng: 28.963 },
  { name: "Marmara University", city: "Istanbul", type: "Public", tuition: "$950 / year", lat: 40.988, lng: 29.076 },
  { name: "Yıldız Technical University", city: "Istanbul", type: "Public", tuition: "$1,050 / year", lat: 41.026, lng: 28.889 },
  { name: "Bahçeşehir University", city: "Istanbul", type: "Private", tuition: "$8,900 / year", scholarship: true, lat: 41.042, lng: 29.008 },
  { name: "Istanbul Bilgi University", city: "Istanbul", type: "Private", tuition: "$7,600 / year", scholarship: true, lat: 41.058, lng: 28.949 },
  { name: "Özyeğin University", city: "Istanbul", type: "Private", tuition: "$11,200 / year", scholarship: true, lat: 41.028, lng: 29.246 },
  { name: "Ankara University", city: "Ankara", type: "Public", tuition: "$1,000 / year", lat: 39.94, lng: 32.836 },
  { name: "Hacettepe University", city: "Ankara", type: "Public", tuition: "$1,250 / year", scholarship: true, ranking: "Leading medical faculty in Türkiye", lat: 39.868, lng: 32.735 },
  { name: "Gazi University", city: "Ankara", type: "Public", tuition: "$880 / year", lat: 39.933, lng: 32.813 },
  { name: "Dokuz Eylül University", city: "Izmir", type: "Public", tuition: "$820 / year", lat: 38.393, lng: 27.078 },
  { name: "Yaşar University", city: "Izmir", type: "Private", tuition: "$6,800 / year", scholarship: true, lat: 38.361, lng: 27.203 },
  { name: "Uludağ University", city: "Bursa", type: "Public", tuition: "$760 / year", lat: 40.229, lng: 28.869 },
  { name: "Selçuk University", city: "Konya", type: "Public", tuition: "$680 / year", lat: 38.021, lng: 32.512 },
  { name: "Anadolu University", city: "Eskişehir", type: "Public", tuition: "$700 / year", ranking: "The largest open education provider in Türkiye", lat: 39.797, lng: 30.502 },
  { name: "Erciyes University", city: "Kayseri", type: "Public", tuition: "$740 / year", lat: 38.71, lng: 35.526 },
  { name: "Ondokuz Mayıs University", city: "Samsun", type: "Public", tuition: "$690 / year", lat: 41.366, lng: 36.192 },
  { name: "Mersin University", city: "Mersin", type: "Public", tuition: "$710 / year", lat: 36.783, lng: 34.526 },
  { name: "Dicle University", city: "Diyarbakır", type: "Public", tuition: "$640 / year", lat: 37.918, lng: 40.253 },
  { name: "İnönü University", city: "Malatya", type: "Public", tuition: "$630 / year", lat: 38.44, lng: 38.32 },
  { name: "Van Yüzüncü Yıl University", city: "Van", type: "Public", tuition: "$600 / year", lat: 38.556, lng: 43.28 },
  { name: "Trakya University", city: "Edirne", type: "Public", tuition: "$720 / year", lat: 41.669, lng: 26.583 },
  { name: "Pamukkale University", city: "Denizli", type: "Public", tuition: "$700 / year", lat: 37.784, lng: 29.106 },
  { name: "Sakarya University", city: "Sakarya", type: "Public", tuition: "$730 / year", lat: 40.741, lng: 30.334 },
  { name: "Süleyman Demirel University", city: "Isparta", type: "Public", tuition: "$650 / year", lat: 37.837, lng: 30.539 },
  { name: "Adnan Menderes University", city: "Aydın", type: "Public", tuition: "$660 / year", lat: 37.845, lng: 27.826 },
  { name: "Muğla Sıtkı Koçman University", city: "Muğla", type: "Public", tuition: "$670 / year", lat: 37.166, lng: 28.373 },
  { name: "Harran University", city: "Şanlıurfa", type: "Public", tuition: "$610 / year", lat: 37.144, lng: 38.826 },
  { name: "Gaziantep University", city: "Gaziantep", type: "Public", tuition: "$640 / year", lat: 37.066, lng: 37.312 },
  { name: "Atatürk University", city: "Erzurum", type: "Public", tuition: "$620 / year", lat: 39.909, lng: 41.242 },
  { name: "Çanakkale Onsekiz Mart University", city: "Çanakkale", type: "Public", tuition: "$680 / year", lat: 40.106, lng: 26.42 },
];

export const universities: University[] = [
  ...FEATURED.map((s, i) => mk(i, s)),
  ...REST.map((s, i) => mk(i + FEATURED.length, s)),
];

export const getUniversity = (slug: string): University | undefined =>
  universities.find((u) => u.slug === slug);

/* Filter facets, derived rather than hand-listed so they cannot drift from the data. */
export const cities: string[] = [...new Set(universities.map((u) => u.city))].sort();

export const languages: string[] = [
  ...new Set(universities.flatMap((u) => u.languages)),
].sort();

export const universityTypes: UniversityType[] = ["Public", "Private"];
