/**
 * The root layout, per locale.
 *
 * There is no `app/layout.tsx`: every page lives under `[locale]`, so this is the
 * topmost layout and it owns `<html>`. That is the point — `lang` and `dir` are
 * properties of the language, and a root layout above the locale segment could not see
 * which language it was rendering.
 *
 * `dir="rtl"` here rather than a class or an effect: Arabic, Persian and Urdu need the
 * document direction set before first paint, and anything applied after hydration is a
 * visible flip.
 */

import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { DesignSystemProvider } from "../providers";
import { LocaleProvider } from "@/i18n/context";
import { loadMessages } from "@/i18n/messages";
import { LOCALES, BCP47, dirFor, isLocale, type Locale } from "@/i18n/locales";
import { baseMetadata, organizationJsonLd, jsonLdScript, alternatesFor } from "@/server/lib/seo";

/* Token imports resolve to /ds/tokens/*.css, which `npm run setup` copies into
   public/. Order matters: tokens before the component classes that consume them. */
import "@/styles/tokens.css";
import "@/styles/base.css";

/**
 * Every locale is a build-time parameter, and only these seventeen.
 *
 * With `dynamicParams` false, `/xx/study` is a 404 rather than a rendered page in a
 * language that does not exist — which also stops crawlers inventing locale segments.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Pinch-zoom is never disabled. `maximum-scale=1` is an accessibility failure that
  // costs nothing to avoid, and EDSAI's accessibility targets are inherited.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F3EE" },
    { media: "(prefers-color-scheme: dark)", color: "#0A2C1E" },
  ],
};

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string }> },
): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  return {
    ...baseMetadata,
    // Every page in every language points at the same set of alternates, so a search
    // engine that finds one can find the other sixteen. Without this, seventeen
    // translations of a page compete with each other instead of serving their markets.
    alternates: alternatesFor("/", locale),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  // Loaded on the server so the browser receives one catalogue, not seventeen.
  const messages = await loadMessages(locale as Locale);

  return (
    <html lang={BCP47[locale as Locale]} dir={dirFor(locale as Locale)}>
      <head>
        <script
          type="application/ld+json"
          // Server-rendered and escaped by `jsonLdScript`. Structured data injected
          // after hydration is not read by crawlers.
          dangerouslySetInnerHTML={{ __html: jsonLdScript(organizationJsonLd()) }}
        />
      </head>
      <body>
        <LocaleProvider locale={locale as Locale} messages={messages}>
          {/* Holds every screen back until the design system bundle has resolved.
              See providers.tsx for why that gate has to exist at all. */}
          <DesignSystemProvider>{children}</DesignSystemProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
