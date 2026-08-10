/**
 * /services
 *
 * A server component whose only job is metadata. The screen itself is EDSAI's and is a
 * client component, because every design system component it renders needs the browser
 * global that `_ds_bundle.js` installs — see app/providers.tsx.
 *
 * This address was a 404 while `/services/medical` worked, so the four services had no
 * shared page: nothing for the navbar to point at and nothing for a crawler to find them
 * through except the individual pages.
 */

import type { Metadata } from "next";
import { pageMetadata } from "@/server/lib/seo";
import { LOCALES, type Locale } from "@/i18n/locales";
import Services from "@/screens/Services";

/**
 * Prerendered in every language. 17 locales x this page.
 */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string }> },
): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({
    title: "Services",
    description:
      "Medical tourism, business facilitation, employment and educational tours — arranged end to end from Türkiye, with a written scope before anything is paid.",
    path: "/services",
    locale: locale as Locale,
  });
}

export default function Page() {
  return <Services />;
}
