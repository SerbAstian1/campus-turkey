/**
 * The sitemap. Generated from the content modules, so it cannot drift from the routes.
 *
 * A hand-maintained sitemap on a site with 40 universities and a growing article list
 * is a file that is wrong within a month. This one is derived from the same modules the
 * pages render from: add a university, and it appears here with no further action.
 *
 * Required by handoff note 6 alongside per-route metadata and canonicals.
 */

import type { MetadataRoute } from "next";
import { universities } from "@contracts/universities";
import { services } from "@contracts/services";
import { articles } from "@contracts/articles";
import { institutions } from "@contracts/institutions";
import { canonical } from "@/server/lib/seo";
import { BCP47, LOCALES, localePath, DEFAULT_LOCALE } from "@/i18n/locales";

/**
 * One entry per page, carrying every language as an alternate.
 *
 * The alternative — seventeen separate entries per page — is also valid, and much
 * larger: 54 pages x 17 locales is 918 rows against 54. More importantly, `alternates`
 * tells a search engine that these are *translations of each other* rather than 918
 * unrelated URLs, which is the same job `hreflang` does in the page head and is worth
 * saying in both places.
 */
function alternates(path: string): { languages: Record<string, string> } {
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) {
    languages[BCP47[locale]] = canonical(localePath(path, locale));
  }
  return { languages };
}

/** A sitemap row for one unprefixed path, in the default locale, with its alternates. */
const entry = (
  path: string,
  lastModified: Date,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
  priority: number,
): MetadataRoute.Sitemap[number] => ({
  url: canonical(localePath(path, DEFAULT_LOCALE)),
  lastModified,
  changeFrequency,
  priority,
  alternates: alternates(path),
});

export const dynamic = "force-static";
/** Rebuilt daily. The content is static today; this is what makes it not stay static. */
export const revalidate = 86400;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  /**
   * Priorities are relative, not absolute — they only rank pages against each other
   * within this file. The ordering reflects the funnel: the pages that convert
   * (apply, study, universities) rank above the pages that reassure (about, contact).
   */
  const staticRoutes: MetadataRoute.Sitemap = [
    entry("/", now, "weekly", 1.0),
    entry("/study", now, "monthly", 0.9),
    entry("/universities", now, "weekly", 0.9),
    entry("/apply", now, "monthly", 0.9),
    entry("/partners", now, "monthly", 0.7),
    entry("/representative", now, "monthly", 0.6),
    entry("/resources", now, "weekly", 0.7),
    entry("/about", now, "yearly", 0.5),
    entry("/contact", now, "yearly", 0.6),
  ];

  const universityRoutes = universities.map((u) =>
    entry(`/universities/${u.slug}`, now, "monthly", 0.8),
  );

  const serviceRoutes = services.map((s) => entry(`/services/${s.slug}`, now, "monthly", 0.8));

  const institutionRoutes = institutions.map((i) =>
    entry(`/institutions/${i.slug}`, now, "monthly", 0.5),
  );

  const articleRoutes = articles.map((a) =>
    // The article's own date, not today's. Claiming every article changed today is how
    // a sitemap's `lastModified` stops being believed.
    entry(`/resources/${a.slug}`, new Date(a.date), "yearly", 0.6),
  );

  // The portal is deliberately absent. It is noindex, auth-gated, and listing it would
  // undo both.
  return [
    ...staticRoutes,
    ...universityRoutes,
    ...serviceRoutes,
    ...articleRoutes,
    ...institutionRoutes,
  ];
}
