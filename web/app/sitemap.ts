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
    { url: canonical("/"), lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: canonical("/study"), lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: canonical("/universities"), lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: canonical("/apply"), lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: canonical("/partners"), lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: canonical("/representative"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: canonical("/resources"), lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: canonical("/about"), lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: canonical("/contact"), lastModified: now, changeFrequency: "yearly", priority: 0.6 },
  ];

  const universityRoutes: MetadataRoute.Sitemap = universities.map((u) => ({
    url: canonical(`/universities/${u.slug}`),
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const serviceRoutes: MetadataRoute.Sitemap = services.map((s) => ({
    url: canonical(`/services/${s.slug}`),
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const articleRoutes: MetadataRoute.Sitemap = articles.map((a) => ({
    url: canonical(`/resources/${a.slug}`),
    // The article's own date, not today's. Claiming every article changed today is how
    // a sitemap's `lastModified` stops being believed.
    lastModified: new Date(a.date),
    changeFrequency: "yearly",
    priority: 0.6,
  }));

  const institutionRoutes: MetadataRoute.Sitemap = institutions.map((i) => ({
    url: canonical(`/institutions/${i.slug}`),
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

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
