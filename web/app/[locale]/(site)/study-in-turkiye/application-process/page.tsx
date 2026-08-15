/**
 * /study-in-turkiye/application-process
 *
 * The hub shows what happens. This shows what to have ready before each step, which is
 * the question that actually stalls an application.
 */

import type { Metadata } from "next";
import { pageMetadata } from "@/server/lib/seo";
import { LOCALES, type Locale } from "@/i18n/locales";
import { getTranslator } from "@/i18n/messages";
import ApplicationProcess from "@/screens/study/ApplicationProcess";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string }> },
): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslator(locale as Locale);
  return pageMetadata({
    title: t("How to apply to a Turkish university"),
    description:
      t("Five steps from first message to first week on campus, and the documents to have ready before each one. Nothing is paid until the student visa is approved."),
    path: "/study-in-turkiye/application-process",
    locale: locale as Locale,
  });
}

export default function Page() {
  return <ApplicationProcess />;
}
