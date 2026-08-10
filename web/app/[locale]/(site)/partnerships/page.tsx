/**
 * /partnerships
 *
 * The hub over the three partner tracks. `/partners` redirects to `/partnerships/agents`
 * rather than here, deliberately: the old address meant the agent offer specifically, and
 * sending an inbound link to a chooser page would make somebody pick again something they
 * had already picked.
 */

import type { Metadata } from "next";
import { pageMetadata } from "@/server/lib/seo";
import { LOCALES, type Locale } from "@/i18n/locales";
import Partnerships from "@/screens/Partnerships";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string }> },
): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({
    title: "Partnerships",
    description:
      "Three ways to work with Campus Turkey: refer students as an agency, hold a country as a representative, or receive students as a university. Terms and commission for each.",
    path: "/partnerships",
    locale: locale as Locale,
  });
}

export default function Page() {
  return <Partnerships />;
}
