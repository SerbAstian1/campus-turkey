/**
 * /study-in-turkiye/student-life
 *
 * The cost of living, added up. Six category cards on the hub answer "what does housing
 * cost"; a student comparing destinations needs one number they can put beside another
 * country's, and six figures do not add themselves.
 */

import type { Metadata } from "next";
import { pageMetadata } from "@/server/lib/seo";
import { LOCALES, type Locale } from "@/i18n/locales";
import StudentLife from "@/screens/study/StudentLife";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string }> },
): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({
    title: "Cost of living for students in Türkiye",
    description:
      "Housing, food, transport and insurance added up two ways — a state dormitory from about $213 a month, a shared private flat from about $353.",
    path: "/study-in-turkiye/student-life",
    locale: locale as Locale,
  });
}

export default function Page() {
  return <StudentLife />;
}
