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
import { db } from "@/server/lib/db";
import { services } from "@contracts/services";
import { articles } from "@contracts/articles";
import { institutions } from "@contracts/institutions";
import { canonical } from "@/server/lib/seo";
import { BCP47, LOCALES, localePath, DEFAULT_LOCALE } from "@/i18n/locales";
import { MOVED_FROM } from "@/app/moved-routes";

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  /**
   * Priorities are relative, not absolute — they only rank pages against each other
   * within this file. The ordering reflects the funnel: the pages that convert
   * (apply, study, universities) rank above the pages that reassure (about, contact).
   */
  const staticRoutes: MetadataRoute.Sitemap = [
    entry("/", now, "weekly", 1.0),
    entry("/study-in-turkiye", now, "monthly", 0.9),
    entry("/study-in-turkiye/scholarships", now, "monthly", 0.85),
    entry("/study-in-turkiye/application-process", now, "monthly", 0.85),
    entry("/study-in-turkiye/student-life", now, "monthly", 0.75),
    entry("/universities", now, "weekly", 0.9),
    entry("/apply", now, "monthly", 0.9),
    entry("/services", now, "monthly", 0.8),
    entry("/partnerships", now, "monthly", 0.7),
    entry("/partnerships/agents", now, "monthly", 0.7),
    entry("/partnerships/representatives", now, "monthly", 0.6),
    entry("/partnerships/universities", now, "monthly", 0.6),
    entry("/resources", now, "weekly", 0.7),
    entry("/about", now, "yearly", 0.5),
    entry("/contact", now, "yearly", 0.6),
  ];

  /**
   * A moved address must never appear here.
   *
   * A sitemap that advertises a URL which answers 308 is telling a crawler to index a
   * redirect — it wastes crawl budget and, worse, keeps the old address alive in the
   * index competing with the one that replaced it. Asserted rather than trusted, because
   * this list and `MOVED_ROUTES` are edited months apart.
   */
  const advertisedButMoved = staticRoutes
    .map((route) => new URL(route.url).pathname)
    .filter((path) => MOVED_FROM.has(path));

  if (advertisedButMoved.length > 0) {
    throw new Error(
      `sitemap advertises ${advertisedButMoved.join(", ")}, which redirect. Point the entry at the new address.`,
    );
  }

  /*
   * Read from the database, not from `content/universities.ts`.
   *
   * The pages are generated from Postgres — `generateStaticParams` queries it — so a
   * sitemap built from the static file advertises whatever that file happens to say.
   * The two diverge the moment a university arrives through the importer or an admin
   * edit: either the page exists and is never listed, or the sitemap advertises a URL
   * that `dynamicParams = false` answers with a 404. One source, one answer.
   *
   * PUBLISHED only, matching `generateStaticParams`. A draft has no page, and listing
   * one is the same soft-404 this file already refuses to emit for moved routes.
   */
  const published = await db.university.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true },
    orderBy: { slug: "asc" },
  });

  const universityRoutes = published.map((u) =>
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
