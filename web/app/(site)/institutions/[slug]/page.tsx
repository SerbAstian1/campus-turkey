/**
 * /institutions/[slug]
 *
 * The partner-facing pages: what Campus Turkey offers universities, agencies and
 * clinics. Prototype path was `#/institutions/<slug>`; unchanged.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { institutions, getInstitution } from "@/content/institutions";
import { pageMetadata } from "@/server/lib/seo";
import Institution from "@/screens/Institution";

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

export function generateStaticParams() {
  return institutions.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const institution = getInstitution(slug);
  if (!institution) return { title: "Not found", robots: { index: false } };

  return pageMetadata({
    title: institution.title,
    description: institution.lead.slice(0, 150).replace(/\s+\S*$/, "") + "…",
    path: `/institutions/${institution.slug}`,
  });
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!getInstitution(slug)) notFound();
  return <Institution slug={slug} />;
}
