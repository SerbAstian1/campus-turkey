/**
 * /privacy
 *
 * A server component whose only job is metadata, matching every other page in `(site)`.
 * The screen itself is a client component because the design system components it
 * renders need the browser global that `_ds_bundle.js` installs.
 *
 * **On the location of this file.** The request was for `app/privacy/page.tsx`. It lives
 * here instead for a reason that is structural rather than stylistic: this application
 * has no `app/layout.tsx`. The root layout is `app/[locale]/layout.tsx`, which is also
 * where the stylesheets, the locale provider and the design system bundle are mounted. A
 * page outside that tree would have no root layout at all, and could not use the design
 * system even if Next allowed it to build.
 *
 * The URL is unaffected. `localePath` leaves the default locale unprefixed, so this file
 * serves `/privacy` in English and `/fr/privacy` and so on for the rest.
 */

import type { Metadata } from "next";
import { pageMetadata } from "@/server/lib/seo";
import { LOCALES, type Locale } from "@/i18n/locales";
import { getTranslator } from "@/i18n/messages";
import Privacy from "@/screens/Privacy";
import { Hydrated } from "@/app/Hydrated";
import { PrivacySeo } from "@/components/seo/routes";

/** Prerendered in every language, like the rest of the marketing site. */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string }> },
): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslator(locale as Locale);
  return pageMetadata({
    title: t("Privacy"),
    description: t("What Campus Turkey collects when you send an enquiry, how long it is kept, and how to ask for it to be deleted."),
    path: "/privacy",
    locale: locale as Locale,
  });
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  /* Server-rendered text first, the design system over it once the bundle resolves.
     A privacy notice in particular has to be readable without running anything. */
  return (
    <Hydrated server={<PrivacySeo locale={locale as Locale} />}>
      <Privacy />
    </Hydrated>
  );
}
