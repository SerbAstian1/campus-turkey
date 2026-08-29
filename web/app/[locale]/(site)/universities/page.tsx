/**
 * /universities
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
import Universities from "@/screens/Universities";
import { Hydrated } from "@/app/Hydrated";
import { UniversitiesSeo } from "@/components/seo/routes";
import { db, withTransientRetry } from "@/server/lib/db";

/**
 * Regenerated hourly, matching the detail pages.
 *
 * The listing below is read from the database, so a purely static build would pin it to
 * whatever the catalogue held at deploy. The same hour the detail pages use keeps the
 * two from disagreeing, which would be worse than either being briefly stale.
 */
export const revalidate = 3600;

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
  title: t("Universities in Türkiye"),
  description: t("Browse Turkish universities by city, language of instruction, tuition and scholarship. Filter, compare and apply."),
  path: "/universities",
    locale: locale as Locale,
  });
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  /*
   * The catalogue, read here so the directory is more than a filter bar to a crawler.
   *
   * The screen fetches the same rows from `/api/universities` after hydration, which is
   * right for filtering and the map and useless for indexing: before this, the one page
   * that should link to all forty university pages linked to none of them. Rendering the
   * list server-side is also what gives those pages an internal link at all, since the
   * navbar and footer have not rendered yet either.
   *
   * Only the seven fields the listing prints. The screen's own query is unchanged.
   */
  const entries = await withTransientRetry(
    () => db.university.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { name: "asc" },
      select: {
        slug: true, name: true, city: true, type: true,
        languages: true, tuitionDisplay: true, programCount: true,
      },
    }),
    { label: "directory listing" },
  );

  return (
    <Hydrated
      server={
        <UniversitiesSeo
          locale={locale as Locale}
          entries={entries.map((entry) => ({
            slug: entry.slug,
            name: entry.name,
            city: entry.city,
            type: entry.type,
            languages: entry.languages,
            tuition: entry.tuitionDisplay,
            programs: entry.programCount,
          }))}
        />
      }
    >
      <Universities />
    </Hydrated>
  );
}
