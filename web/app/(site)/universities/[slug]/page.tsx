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

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { universities, getUniversity } from "@/content/universities";
import { pageMetadata, universityJsonLd, jsonLdScript } from "@/server/lib/seo";
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
 * Safe here because the catalogue is a static content module: every real slug is known
 * at build time. Adding one means a rebuild, which was already true.
 */
export const dynamicParams = false;

/**
 * Prerender all forty at build time.
 *
 * The catalogue is static content, so every one of these can be HTML on a CDN rather
 * than a render on request — which is also what makes the crawler's job trivial.
 */
export function generateStaticParams() {
  return universities.map((u) => ({ slug: u.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const university = getUniversity(slug);
  if (!university) return { title: "University not found", robots: { index: false } };

  return pageMetadata({
    title: `${university.name}, ${university.city}`,
    // Trimmed at a word boundary: a description cut mid-word looks broken in a result.
    description: university.about.slice(0, 150).replace(/\s+\S*$/, "") + "…",
    path: `/universities/${university.slug}`,
  });
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const university = getUniversity(slug);

  // The 404 a hash-routed SPA could not produce. Handoff note 12.
  if (!university) notFound();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(universityJsonLd(university)) }}
      />
      <UniversityDetail slug={slug} />
    </>
  );
}
