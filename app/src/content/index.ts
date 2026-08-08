/**
 * Content loader — the CMS boundary.
 *
 * Today these are static typed modules, one per collection, so each screen's chunk
 * pulls only what it renders. When a CMS or an API replaces them, only the files in
 * this folder change: every screen imports from here and compiles against `types.ts`,
 * so the swap is a loader change rather than a rewrite.
 */

export * from "./types";

export { universities, getUniversity, cities, languages, universityTypes, slugify } from "./universities";
export { services, getService } from "./services";
export { institutions, getInstitution } from "./institutions";
export { articles, getArticle } from "./articles";

export { nav, footerColumns, socials } from "./site";
export type { NavEntry, FooterColumn, FooterLink } from "./site";
export { serviceCards, stats, journey, testimonials } from "./home";
export { scholarships, studentLife, generalFaq } from "./study";
export { offices, milestones, leadership, accreditations, contact } from "./company";
export { partnerBenefits, representativeSteps, representative } from "./partners";

/* Namespaced: the portal's names (account, students, actions, wallet) are too generic
   to sit in a shared barrel. Import as `portal.students`. */
export * as portal from "./portal";
