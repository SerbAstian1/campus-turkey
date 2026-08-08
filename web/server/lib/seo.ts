/**
 * SEO — per-route metadata, canonicals, and structured data.
 *
 * Handoff note 6 is the reason this file exists, and it is blunt about the stakes:
 * hash routing means "every page shares one URL, one `<title>` and one meta
 * description. For a business whose funnel is organic search on 'study in Türkiye',
 * this is the most expensive omission in this document."
 *
 * Everything here is server-rendered. A title injected by client JavaScript after
 * hydration is not read by most crawlers and is not read by any link preview.
 */

import type { Metadata } from "next";
import type { Article, Service, University } from "@contracts/types";

const ORIGIN = process.env["SITE_ORIGIN"] ?? "https://campusturkey.com";

const SITE_NAME = "Campus Turkey";
const DEFAULT_DESCRIPTION =
  "Study in Türkiye with a guide who has done it before. University placement, visas, accommodation and medical support for students from Africa, the Middle East and South Asia.";

export function canonical(path: string): string {
  return new URL(path, ORIGIN).toString();
}

/**
 * Base metadata, merged into every route.
 *
 * `metadataBase` is what makes every relative Open Graph image resolve to an absolute
 * URL. Without it Next emits a relative path, and no social platform resolves one.
 */
export const baseMetadata: Metadata = {
  metadataBase: new URL(ORIGIN),
  title: {
    default: `${SITE_NAME} — Study in Türkiye`,
    // Every page's own title slots in; the suffix is never repeated by hand.
    template: `%s — ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en",
    url: ORIGIN,
  },
  twitter: { card: "summary_large_image" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  icons: { icon: "/assets/mark-onlight.png" },
};

interface PageMetaInput {
  title: string;
  description: string;
  path: string;
  /** Set for the portal and anything else that must never be indexed. */
  noindex?: boolean;
  image?: string;
}

export function pageMetadata(input: PageMetaInput): Metadata {
  const url = canonical(input.path);
  return {
    title: input.title,
    description: input.description,
    // The canonical is the single highest-value tag on a site with filterable listings:
    // it is what stops `/universities?city=Istanbul` competing with `/universities`.
    alternates: { canonical: url },
    openGraph: {
      title: input.title,
      description: input.description,
      url,
      ...(input.image ? { images: [{ url: input.image }] } : {}),
    },
    ...(input.noindex ? { robots: { index: false, follow: false } } : {}),
  };
}

// ------------------------------------------------------------- structured data
//
// JSON-LD, emitted server-side. Handoff note 6 asks for it on the university and
// article pages specifically — those are the two collections that can earn rich
// results, and the two whose pages a search engine has no other way to categorise.

export function organizationJsonLd(): object {
  return {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: SITE_NAME,
    url: ORIGIN,
    logo: canonical("/assets/logo-lockup-onlight.png"),
    description: DEFAULT_DESCRIPTION,
    areaServed: "Türkiye",
  };
}

export function universityJsonLd(university: University): object {
  return {
    "@context": "https://schema.org",
    "@type": "CollegeOrUniversity",
    name: university.name,
    url: canonical(`/universities/${university.slug}`),
    description: university.about,
    foundingDate: String(university.founded),
    address: {
      "@type": "PostalAddress",
      addressLocality: university.city,
      addressCountry: "TR",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: university.lat,
      longitude: university.lng,
    },
    // `tuition` is a display string ("$4,000–$8,000 / year"), not a number. It is not
    // mapped to a price field: emitting a malformed price is worse than emitting none,
    // because a wrong rich result is a wrong promise about money.
  };
}

export function articleJsonLd(article: Article): object {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.body,
    datePublished: article.date,
    author: { "@type": "Person", name: article.author },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: canonical("/assets/logo-lockup-onlight.png") },
    },
    mainEntityOfPage: canonical(`/resources/${article.slug}`),
  };
}

export function serviceJsonLd(service: Service): object {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    description: service.lead,
    provider: { "@type": "Organization", name: SITE_NAME },
    url: canonical(`/services/${service.slug}`),
  };
}

/**
 * FAQ structured data. Every service page and the study hub carry a real FAQ, and this
 * is the one schema type that reliably still earns extra space in a result.
 */
export function faqJsonLd(items: Array<{ question: string; answer: string }>): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

/**
 * Serialise for a `<script type="application/ld+json">`.
 *
 * `<` is escaped because JSON-LD is injected with `dangerouslySetInnerHTML`, and a
 * string in the content containing `</script>` would otherwise close the tag and turn
 * structured data into an XSS vector. The content here is static today; it will not
 * always be.
 */
export function jsonLdScript(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
