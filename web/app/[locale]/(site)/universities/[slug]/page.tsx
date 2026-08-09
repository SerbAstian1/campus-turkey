/**
 * /universities/[slug]
 *
 * The page the whole routing migration was for. Forty of these exist, each is a real
 * URL with its own title, description, canonical and structured data, and an unknown
 * slug returns a genuine HTTP 404 rather than a 200 carrying an error screen.
 *
 * Under hash routing all forty shared one URL and one title, and handoff note 6 called
 * that the most expensive omission in the document.
 */

import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/server/lib/db";
import { pageMetadata, universityJsonLd, jsonLdScript } from "@/server/lib/seo";
import { LOCALES, type Locale } from "@/i18n/locales";
import UniversityDetail from "@/screens/UniversityDetail";

/**
 * Any slug not returned by `generateStaticParams` is a genuine 404, refused before
 * rendering begins.
 *
 * This is the line that makes the status code correct. With the default
 * (`dynamicParams = true`) Next renders unknown slugs on demand, and by the time the
 * page calls `notFound()` the response has already begun streaming — so the *body* is
 * the not-found page while the *status* is a 200. That is precisely the soft 404 that
 * handoff note 12 exists to eliminate, and it is invisible in a browser.
 *
 * **Kept `false` now that the catalogue lives in the database.** The tempting move when
 * a source becomes editable is to allow on-demand rendering so a newly added university
 * appears without a rebuild — but that trades a correct 404 for a soft one on every
 * mistyped URL, which is a permanent cost for an occasional convenience. `revalidate`
 * below gives the same freshness without it: an *edit* to an existing university appears
 * within the hour, and a genuinely *new* one appears on the next deploy.
 */
export const dynamicParams = false;

/**
 * Rebuild each page at most once an hour, on demand.
 *
 * The directory used to be a source file, so "static" and "correct" were the same thing.
 * Now that an admin can edit it, a purely static build would serve last deploy's copy
 * indefinitely. An hour is chosen against how the data actually changes: tuition and
 * intake dates are revised in batches a few times a year, and nobody is harmed by seeing
 * yesterday's description for another forty minutes.
 */
export const revalidate = 3600;

/**
 * Published universities only. A draft has no page, which is what draft means.
 *
 * Wrapped in React's `cache` so `generateMetadata` and the page body share one query
 * rather than each issuing their own. Next calls both for every page it renders, so
 * without this the build runs two identical queries per page — 1,360 across forty
 * universities in seventeen languages, of which half are pure waste.
 *
 * This is per-render memoisation, not a data cache: it lasts for one page render and
 * cannot serve stale rows to a later one.
 */
const findUniversity = cache(async (slug: string) => {
  return db.university.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: {
      slug: true, name: true, city: true, type: true, description: true,
      website: true, founded: true, latitude: true, longitude: true,
      languages: true, tuitionDisplay: true, programCount: true, scholarship: true,
      studentsDisplay: true, ranking: true, faculties: true, deadlines: true,
    },
  });
});

const SIMILAR_FIELDS = {
  slug: true, name: true, city: true, type: true,
  languages: true, tuitionDisplay: true, programCount: true, scholarship: true,
} as const;

/**
 * Three universities a reader might consider instead.
 *
 * Same city first, then same type. That ordering is the whole value of the feature:
 * another university in the same city is a genuine alternative, while another private
 * university four hundred miles away is only nominally similar.
 *
 * Two queries rather than one with an `OR`. A single query cannot express "prefer these
 * matches over those" without a raw `CASE`, and an `OR` returns them interleaved by
 * name — which produces a list that looks arbitrary, because it is.
 */
async function findSimilar(university: { slug: string; city: string; type: "PUBLIC" | "PRIVATE" }) {
  const sameCity = await db.university.findMany({
    where: { status: "PUBLISHED", slug: { not: university.slug }, city: university.city },
    orderBy: { name: "asc" },
    take: 3,
    select: SIMILAR_FIELDS,
  });

  if (sameCity.length >= 3) return sameCity;

  const sameType = await db.university.findMany({
    where: {
      status: "PUBLISHED",
      type: university.type,
      // Excludes the subject and everything already chosen, so the list cannot repeat
      // a university that the city query already returned.
      slug: { notIn: [university.slug, ...sameCity.map((u) => u.slug)] },
    },
    orderBy: { name: "asc" },
    take: 3 - sameCity.length,
    select: SIMILAR_FIELDS,
  });

  return [...sameCity, ...sameType];
}

export async function generateStaticParams() {
  // Every page, in every language, read from the database at build time. The cross
  // product is still known before the first request; it is now a query rather than an
  // import.
  const universities = await db.university.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true },
  });

  return LOCALES.flatMap((locale) =>
    universities.map((u) => ({ locale, slug: u.slug })),
  );
}

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string; slug: string }> },
): Promise<Metadata> {
  const { locale, slug } = await params;
  const university = await findUniversity(slug);
  if (!university) return { title: "University not found", robots: { index: false } };

  return pageMetadata({
    title: `${university.name}, ${university.city}`,
    // Trimmed at a word boundary: a description cut mid-word looks broken in a result.
    description: university.description.slice(0, 150).replace(/\s+\S*$/, "") + "…",
    path: `/universities/${university.slug}`,
    locale: locale as Locale,
  });
}

export default async function Page({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { slug } = await params;
  const university = await findUniversity(slug);

  // The 404 a hash-routed SPA could not produce. Handoff note 12.
  if (!university) notFound();

  const similar = await findSimilar(university);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(universityJsonLd(university)) }}
      />
      <UniversityDetail
        university={{
          slug: university.slug,
          name: university.name,
          city: university.city,
          type: university.type,
          about: university.description,
          languages: university.languages,
          tuition: university.tuitionDisplay,
          programs: university.programCount,
          scholarship: university.scholarship,
          founded: university.founded,
          students: university.studentsDisplay,
          ranking: university.ranking,
          faculties: university.faculties,
          // Stored as JSON because the pairs must stay paired. Cast at the boundary
          // rather than trusted throughout: this is the one place that knows the shape.
          deadlines: (university.deadlines as [string, string][] | null) ?? [],
        }}
        similar={similar.map((s) => ({
          slug: s.slug,
          name: s.name,
          city: s.city,
          type: s.type,
          languages: s.languages,
          tuition: s.tuitionDisplay,
          programs: s.programCount,
          scholarship: s.scholarship,
        }))}
      />
    </>
  );
}
