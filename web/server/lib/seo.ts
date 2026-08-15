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
import type { Article, Service } from "@contracts/types";
import {
  BCP47, DEFAULT_LOCALE, LOCALES, localePath, type Locale,
} from "@/i18n/locales";
import { env } from "./config";

/**
 * The public origin, from the one validated source.
 *
 * This read used to be `process.env["SITE_ORIGIN"] ?? "https://campusturkey.com"`, and
 * both halves of that were wrong. It bypassed `config.ts`, which is what enforces that
 * the origin is a URL and is https in production — so the check that exists to catch a
 * bad origin could not see the value actually being used. And the fallback was a domain
 * this project does not own: with `SITE_ORIGIN` absent from the *build* environment, a
 * build would succeed and bake `campusturkey.com` into every canonical, every `hreflang`
 * pair and all 918 sitemap rows, pointing the whole site's search presence at somebody
 * else. Silently, because a default is indistinguishable from a real value once set.
 *
 * There is deliberately no fallback now. `SITE_ORIGIN` is required in `config.ts`, so a
 * missing one fails at boot with a named variable, which is the loud version of the same
 * problem and the one that gets fixed in a minute rather than a quarter.
 */
const ORIGIN = env.SITE_ORIGIN;

const SITE_NAME = "Campus Turkey";
const DEFAULT_DESCRIPTION =
  "Study in Türkiye with a guide who has done it before. University placement, visas, accommodation and medical support for students from Africa, the Middle East and South Asia.";

export function canonical(path: string): string {
  return new URL(path, ORIGIN).toString();
}

/**
 * The canonical and `hreflang` set for one page across every locale.
 *
 * This is the single most consequential tag on a multilingual site. Without it,
 * seventeen translations of the same page look to a search engine like seventeen pages
 * competing for the same queries; with it, each is served to the market that reads its
 * language.
 *
 * `x-default` points at English — it is what a searcher gets when none of the seventeen
 * matches their browser, and omitting it leaves that choice to a guess.
 *
 * `path` is the *unprefixed* path (`/study`, `/universities/bilkent-university`).
 * `localePath` adds the segment for every locale except English, which stays at the
 * root so already-published links keep working.
 */
export function alternatesFor(path: string, locale: Locale): Metadata["alternates"] {
  const languages: Record<string, string> = {};

  for (const other of LOCALES) {
    languages[BCP47[other]] = canonical(localePath(path, other));
  }
  languages["x-default"] = canonical(localePath(path, DEFAULT_LOCALE));

  return {
    canonical: canonical(localePath(path, locale)),
    languages,
  };
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
  /** The unprefixed path. The locale segment is added by `alternatesFor`. */
  path: string;
  /**
   * Which language this page is being rendered in. Determines the canonical and the
   * `og:locale`; the `hreflang` set is the same for every locale of a given page.
   */
  locale?: Locale;
  /** Set for the portal and anything else that must never be indexed. */
  noindex?: boolean;
  image?: string;
}

export function pageMetadata(input: PageMetaInput): Metadata {
  const locale = input.locale ?? DEFAULT_LOCALE;
  const url = canonical(localePath(input.path, locale));

  return {
    title: input.title,
    description: input.description,
    /*
     * Canonical plus the full `hreflang` set.
     *
     * The canonical alone was enough when the site was one language — it stops
     * `/universities?city=Istanbul` competing with `/universities`. With seventeen
     * translations it is not: without `hreflang`, each translation looks like a
     * duplicate rather than the version for a particular market.
     */
    alternates: alternatesFor(input.path, locale),
    openGraph: {
      title: input.title,
      description: input.description,
      url,
      locale: BCP47[locale],
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

/**
 * The seven fields structured data actually needs.
 *
 * Declared structurally rather than as the content module's `University`, because the
 * directory now comes from the database and the two shapes differ in fields this
 * function never touches. Demanding the whole record forced a caller to fetch ten
 * columns to emit four.
 */
export interface UniversityForJsonLd {
  slug: string;
  name: string;
  city: string;
  description: string;
  founded: number | null;
  latitude: number | null;
  longitude: number | null;
}

export function universityJsonLd(university: UniversityForJsonLd): object {
  return {
    "@context": "https://schema.org",
    "@type": "CollegeOrUniversity",
    name: university.name,
    url: canonical(`/universities/${university.slug}`),
    description: university.description,
    // Omitted rather than emitted as "null". A structured-data field with a placeholder
    // value is a claim that the value is unknown-but-stated, which is worse than absent.
    ...(university.founded ? { foundingDate: String(university.founded) } : {}),
    address: {
      "@type": "PostalAddress",
      addressLocality: university.city,
      addressCountry: "TR",
    },
    ...(university.latitude !== null && university.longitude !== null
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: university.latitude,
            longitude: university.longitude,
          },
        }
      : {}),
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
