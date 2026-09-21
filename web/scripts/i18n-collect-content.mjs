/**
 * Collect the content-driven strings `t(x.field)` calls translate at runtime, and merge
 * them into `en/content.json`.
 *
 * `scripts/i18n-extract.mjs` finds every literal `t("...")` call; it cannot find these,
 * because the argument is a variable whose value depends on which university, service or
 * article is being rendered. This script imports the same content modules and inline
 * screen constants the screens do, walks them with the exact same whitelist
 * `translateContent` uses at each call site, and writes what it finds as identity
 * entries — same convention as `i18n-extract.mjs --write`.
 *
 * Run via tsx, because the modules it imports are TypeScript:
 *
 *   npx tsx scripts/i18n-collect-content.mjs
 *
 * Keep the whitelist below in step with the `translateContent(...)` call in the screen
 * that actually renders each piece of content — this script has no way to check that for
 * itself, unlike the literal-string extractor.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { collectContentStrings } from "../src/i18n/content.ts";

import { serviceCards, stats, journey, testimonials } from "../src/content/home.ts";
import { scholarships, studentLife, generalFaq } from "../src/content/study.ts";
import { services } from "../src/content/services.ts";
import { institutions } from "../src/content/institutions.ts";
import { partnerBenefits, representative, representativeSteps } from "../src/content/partners.ts";
import { offices, leadership, milestones, accreditations } from "../src/content/company.ts";
import { articles } from "../src/content/articles.ts";
import { footerColumns } from "../src/content/site.ts";

import { COUNTRIES as APPLY_COUNTRIES, CITIES, INTAKES, LEVELS } from "../src/screens/Apply.tsx";
import { TOPICS } from "../src/screens/Contact.tsx";
import { TRACKS } from "../src/screens/Partnerships.tsx";
import { PARTNER_KINDS as PARTNERS_PAGE_KINDS } from "../src/screens/Partners.tsx";
import { PARTNER_KINDS as LOGIN_PARTNER_KINDS, COUNTRIES as LOGIN_COUNTRIES, LEVEL_LABELS } from "../src/screens/PartnerLogin.tsx";
import { VOLUMES } from "../src/screens/PartnerForm.tsx";

const SERVICE_KEYS = [
  "eyebrow", "title", "lead", "cta", "label", "description", "body",
  "meta", "item", "items", "note", "tags", "trust", "question", "answer",
];
const INSTITUTION_KEYS = ["eyebrow", "title", "lead", "cta", "label", "description", "body", "list"];
const ARTICLE_KEYS = ["tag", "title", "body", "heading", "paragraphs", "author"];
const MEGA_KEYS = ["title", "label", "description"];

const found = new Set();

collectContentStrings(journey, ["meta", "title", "description"], found);
collectContentStrings(serviceCards, ["title", "badge", "description", "points", "ctaLabel"], found);
collectContentStrings(stats, ["label", "description"], found);
collectContentStrings(testimonials, ["quote", "role", "country"], found);
collectContentStrings(generalFaq, ["question", "answer"], found);
collectContentStrings(scholarships, ["name", "who", "covers", "when", "competitive"], found);
collectContentStrings(studentLife, ["title", "body"], found);
collectContentStrings(services, SERVICE_KEYS, found);
collectContentStrings(institutions, INSTITUTION_KEYS, found);
collectContentStrings(partnerBenefits, ["title", "body"], found);
collectContentStrings(representative, ["title", "body", "requirements", "question", "answer", "earnings"], found);
collectContentStrings(representativeSteps, ["meta", "title", "description"], found);
collectContentStrings(leadership, ["role", "note"], found);
collectContentStrings(milestones, ["meta", "title", "description"], found);
collectContentStrings(offices, ["role"], found);
accreditations.forEach((a) => found.add(a));
collectContentStrings(articles, ARTICLE_KEYS, found);
collectContentStrings(footerColumns, ["label"], found);
collectContentStrings(TRACKS, ["eyebrow", "title", "body", "terms", "notFor", "cta"], found);

/*
 * mega.tsx's two menus are built inside a hook that calls `useHref()`, which needs a
 * router context this script has none of — they cannot be imported and walked the way
 * everything above was. Transcribed instead. Keep this list in step with mega.tsx by
 * hand; there is no automated check that it stays in sync, which is the trade for not
 * needing a browser to run this script.
 */
const MEGA_MENUS = [
  { title: "Education", links: [
    { label: "Study in Türkiye", description: "Admissions and scholarships" },
    { label: "University directory", description: "Public and private" },
    { label: "Educational tours", description: "Campus and study visits" },
    { label: "Scholarships", description: "What you can get" },
  ] },
  { title: "Other services", links: [
    { label: "All services", description: "The four, side by side" },
    { label: "Medical Tourism", description: "Hospitals and travel" },
    { label: "Business Facilitation", description: "Invitations and B2B" },
    { label: "Employment", description: "Legal and seasonal work" },
  ] },
  { title: "Resources", links: [
    { label: "Scholarship guide" }, { label: "Visa checklist" },
    { label: "Cost of living" }, { label: "All resources" },
  ] },
  { title: "Work with us", links: [
    { label: "All partnerships", description: "Which one you are" },
    { label: "Become a Partner", description: "Agencies and consultants" },
    { label: "Become a Representative", description: "Country representatives" },
    { label: "Login", description: "Students, partners, representatives and staff" },
  ] },
  { title: "For institutions", links: [
    { label: "Universities" }, { label: "Hospitals" }, { label: "Agencies" }, { label: "Chambers of commerce" },
  ] },
];
collectContentStrings(MEGA_MENUS, MEGA_KEYS, found);

/* Flat option lists, consumed via `t(value)` directly rather than through
   `translateContent` — every string in each list needs the catalogue, no key to check. */
for (const list of [
  APPLY_COUNTRIES, CITIES, INTAKES, LEVELS, TOPICS,
  PARTNERS_PAGE_KINDS, LOGIN_PARTNER_KINDS, LOGIN_COUNTRIES, LEVEL_LABELS, VOLUMES,
]) {
  for (const s of list) found.add(s);
}

const here = dirname(fileURLToPath(import.meta.url));
const target = join(here, "..", "src", "i18n", "messages", "en", "content.json");
mkdirSync(dirname(target), { recursive: true });

const existing = existsSync(target) ? JSON.parse(readFileSync(target, "utf8")) : {};
const merged = { ...existing };
for (const key of found) merged[key] = key;

const added = [...found].filter((k) => !(k in existing)).length;
const sorted = Object.fromEntries(Object.keys(merged).sort().map((k) => [k, merged[k]]));
writeFileSync(target, JSON.stringify(sorted, null, 2) + "\n", "utf8");

console.log(`content.json: ${Object.keys(sorted).length} keys (+${added})`);
