/**
 * /services/[slug]
 *
 * Carries both Service and FAQPage structured data. The FAQ is the one schema type that
 * still reliably earns extra space in a result, and every service page has a real one.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { services, getService } from "@/content/services";
import { pageMetadata, serviceJsonLd, faqJsonLd, jsonLdScript } from "@/server/lib/seo";
import Service from "@/screens/Service";

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
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) return { title: "Service not found", robots: { index: false } };

  return pageMetadata({
    title: service.title,
    description: service.lead.slice(0, 150).replace(/\s+\S*$/, "") + "…",
    path: `/services/${service.slug}`,
  });
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(serviceJsonLd(service)) }}
      />
      {service.faq.length > 0 ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd(service.faq)) }}
        />
      ) : null}
      <Service slug={slug} />
    </>
  );
}
