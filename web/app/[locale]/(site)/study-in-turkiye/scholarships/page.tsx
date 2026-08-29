/**
 * /study-in-turkiye/scholarships
 *
 * Its own address because the navbar and footer both carried a link labelled
 * "Scholarships" that resolved to the hub, where the section sits below six reasons to
 * choose Türkiye. A visitor arriving on that word was made to scroll past the preamble
 * to reach their answer.
 */

import type { Metadata } from "next";
import { pageMetadata } from "@/server/lib/seo";
import { LOCALES, type Locale } from "@/i18n/locales";
import { getTranslator } from "@/i18n/messages";
import Scholarships from "@/screens/study/Scholarships";
import { Hydrated } from "@/app/Hydrated";
import { ScholarshipsSeo } from "@/components/seo/routes";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string }> },
): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslator(locale as Locale);
  return pageMetadata({
    title: t("Scholarships to study in Türkiye"),
    description:
      t("Türkiye Bursları, private merit awards, country quotas and family discounts — what each covers, when to apply and how competitive it really is."),
    path: "/study-in-turkiye/scholarships",
    locale: locale as Locale,
  });
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  /* Server-rendered text first, the design system over it once the bundle resolves.
     See src/app/Hydrated.tsx for why the fallback is the content and not a spinner. */
  return (
    <Hydrated server={<ScholarshipsSeo locale={locale as Locale} />}>
      <Scholarships />
    </Hydrated>
  );
}
