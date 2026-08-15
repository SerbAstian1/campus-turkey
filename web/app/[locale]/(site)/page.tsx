/**
 * /
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
import Home from "@/screens/Home";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string }> },
): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslator(locale as Locale);

  return {
    ...pageMetadata({
      title: t("Campus Turkey — Study in Türkiye"),
      description:
        t("Study in Türkiye with a guide who has done it before. University placement, visas, accommodation and medical support for students from Africa, the Middle East and South Asia."),
      path: "/",
      locale: locale as Locale,
    }),
    // `absolute` so the "— Campus Turkey" suffix is not appended. Without it the
    // homepage and /study both render "Study in Türkiye — Campus Turkey", and two
    // pages competing on one title is a self-inflicted ranking problem.
    title: { absolute: t("Campus Turkey — Study in Türkiye") },
  };
}

export default function Page() {
  return <Home />;
}
