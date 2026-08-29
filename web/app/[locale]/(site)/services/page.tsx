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
import { getTranslator } from "@/i18n/messages";
import Services from "@/screens/Services";
import { Hydrated } from "@/app/Hydrated";
import { ServicesSeo } from "@/components/seo/routes";

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
  const t = await getTranslator(locale as Locale);
  return pageMetadata({
    title: t("Services"),
    description:
      t("Medical tourism, business facilitation, employment and educational tours — arranged end to end from Türkiye, with a written scope before anything is paid."),
    path: "/services",
    locale: locale as Locale,
  });
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  /* Server-rendered text first, the design system over it once the bundle resolves.
     See src/app/Hydrated.tsx for why the fallback is the content and not a spinner. */
  return (
    <Hydrated server={<ServicesSeo locale={locale as Locale} />}>
      <Services />
    </Hydrated>
  );
}
