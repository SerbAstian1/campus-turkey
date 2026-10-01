/**
 * /contact
 *
 * The appointment screen uses native token-styled controls so its usable form is present
 * in the server response. It does not wait for the optional browser-only design-system
 * bundle before visitors can choose a time or enter their details.
 *
 * The metadata below is emitted in the server's HTML, which is what makes this
 * migration worth doing: title, description and canonical are readable without running
 * any JavaScript. Handoff note 6.
 */

import type { Metadata } from "next";
import { pageMetadata } from "@/server/lib/seo";
import { LOCALES, type Locale } from "@/i18n/locales";
import { getTranslator } from "@/i18n/messages";
import Contact from "@/screens/Contact";

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
  title: t("Contact us"),
  description: t("Talk to someone about studying in Türkiye. Offices, WhatsApp, and a form that reaches a real person."),
  path: "/contact",
    locale: locale as Locale,
  });
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  await params;

  /* The appointment form is native React and renders in the first HTML response. It no
     longer waits for the optional browser-only design-system bundle before becoming
     visible and usable. */
  return <Contact />;
}
