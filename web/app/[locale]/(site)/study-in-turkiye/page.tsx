/**
 * /study-in-turkiye
 *
 * A server component whose only job is metadata. The screen itself is EDSAI's and is a
 * client component, because every design system component it renders needs the browser
 * global that `_ds_bundle.js` installs — see app/providers.tsx.
 *
 * The metadata below is emitted in the server's HTML, which is what makes this
 * migration worth doing: title, description and canonical are readable without running
 * any JavaScript. Handoff note 6.
 */

import type { Metadata } from "next";
import { pageMetadata } from "@/server/lib/seo";
import { LOCALES, type Locale } from "@/i18n/locales";
import { getTranslator } from "@/i18n/messages";
import Study from "@/screens/Study";
import { Hydrated } from "@/app/Hydrated";
import { StudySeo } from "@/components/seo/routes";

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
  title: t("Study in Türkiye"),
  description: t("Tuition, scholarships, intakes and what a year in Türkiye actually costs. Written for students applying from abroad."),
  path: "/study-in-turkiye",
    locale: locale as Locale,
  });
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  /* Server-rendered text first, the design system over it once the bundle resolves.
     See src/app/Hydrated.tsx for why the fallback is the content and not a spinner. */
  return (
    <Hydrated server={<StudySeo locale={locale as Locale} />}>
      <Study />
    </Hydrated>
  );
}
