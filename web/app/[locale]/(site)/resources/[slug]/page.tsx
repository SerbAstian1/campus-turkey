/**
 * /resources/[slug]
 *
 * The prototype published these at `#/blog/<slug>`. `next.config.mjs` 308s the old
 * `/blog/:slug` shape here so nothing already shared breaks.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { articles, getArticle } from "@/content/articles";
import { pageMetadata, articleJsonLd, jsonLdScript } from "@/server/lib/seo";
import { LOCALES, type Locale } from "@/i18n/locales";
import Article from "@/screens/Article";

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
  // Every page, in every language. The catalogue is static content, so the whole
  // cross product is known at build time and none of it needs a render on request.
  return LOCALES.flatMap((locale) =>
    articles.map((a) => ({ locale, slug: a.slug })),
  );
}

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string; slug: string }> },
): Promise<Metadata> {
  const { locale, slug } = await params;
  const article = getArticle(slug);
  if (!article) return { title: "Article not found", robots: { index: false } };

  return pageMetadata({
    title: article.title,
    description: article.body.slice(0, 150).replace(/\s+\S*$/, "") + "…",
    path: `/resources/${article.slug}`,
    locale: locale as Locale,
  });
}

export default async function Page({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(articleJsonLd(article)) }}
      />
      <Article slug={slug} />
    </>
  );
}
