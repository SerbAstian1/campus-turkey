/**
 * /partnerships/universities
 *
 * The university partnership offer. Content unchanged from `/institutions/universities`,
 * which redirects here — a university partnership is a partnership, and grouping it with
 * the agent and representative offers is the brief's information architecture.
 *
 * Rendered by the same `Institution` screen, reading the same record. A copy of the
 * content under a new name would be two things to keep in step, and the second one is
 * always the one that goes stale.
 */

import type { Metadata } from "next";
import { getInstitution } from "@/content/institutions";
import { pageMetadata } from "@/server/lib/seo";
import { LOCALES, type Locale } from "@/i18n/locales";
import { getTranslator } from "@/i18n/messages";
import Institution from "@/screens/Institution";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string }> },
): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslator(locale as Locale);
  const institution = getInstitution("universities");

  return pageMetadata({
    title: t("University partnerships"),
    /*
     * The content lead when there is one, and a translated sentence when there is not.
     * Only the fallback goes through `t()`: the lead comes from the content module,
     * which is a separate namespace and not translated yet — wrapping it here would put
     * a variable where the extractor needs a literal and reach the catalogue as nothing.
     */
    description:
      institution?.lead.slice(0, 150).replace(/\s+\S*$/, "") ??
      t("Recruitment agreements with Turkish universities: pre-screened applicants, intake reporting and a two-week agreement turnaround."),
    path: "/partnerships/universities",
    locale: locale as Locale,
  });
}

export default function Page() {
  return <Institution slug="universities" />;
}
