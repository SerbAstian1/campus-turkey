/**
 * The locales this site serves, and the URL scheme that carries them.
 *
 * This module is deliberately free of React and of Next: it is imported by the
 * middleware (Edge runtime), by server components, by client components and by the
 * build scripts. Anything that cannot run in all four does not belong here.
 *
 * **English is not prefixed.** `/study` is English; `/ar/study` is Arabic. The
 * prototype published unprefixed addresses and handoff note 6 is explicit that those
 * are the ones already shared — moving English to `/en/study` would break every link
 * in the wild to gain nothing.
 */

export const DEFAULT_LOCALE = "en" as const;

/**
 * Locale codes are lowercase in URLs and uppercase in the switcher, because
 * `LANGUAGES` in ./index.ts is the design system's list and uses uppercase. One
 * conversion, stated in one place, rather than a `.toLowerCase()` scattered around.
 */
export const LOCALES = [
  "en", "ar", "fr", "tr", "ru", "sw", "es", "pt",
  "fa", "ur", "hi", "bn", "id", "zh", "ha", "yo", "ig",
] as const;


/**
 * The locales advertised to search engines, as distinct from the ones that work.
 *
 * Every locale in `LOCALES` above has a route and a language switcher entry, and a
 * visitor who picks one gets whatever has been translated with English underneath.
 * That is a reasonable thing to offer. What is not reasonable is telling Google, via
 * `hreflang` and the sitemap, that a page *is* in Turkish when 84% of its words are
 * English — the tag is a claim about the page's content, and a wrong one gets the page
 * demoted or the tag ignored across the whole set.
 *
 * So advertising is separated from availability. This list is the subset whose
 * catalogues are substantially complete; `i18n-advertised.test.ts` measures the real
 * files and fails if any entry here cannot back the claim.
 *
 * It is short right now because the catalogues are: five locales carry the reviewed
 * phrases imported from the prototype and sit near 16%, and eleven have almost
 * nothing. Fill them — `scripts/i18n-machine-translate.mjs` is the sweep, and a native
 * speaker's review is what makes it shippable — then add the locale here and let the
 * test confirm it earned the place. That was audit finding M4.
 */
export const ADVERTISED_LOCALES = [DEFAULT_LOCALE] as const;

/** The share of the English catalogue a locale must carry before it may be advertised. */
export const ADVERTISED_COVERAGE_FLOOR = 0.9;

export type Locale = (typeof LOCALES)[number];

/** Right-to-left scripts. Drives `dir` on `<html>` and the design system's RTL layout. */
export const RTL_LOCALES = new Set<Locale>(["ar", "fa", "ur"]);

export const isRtl = (locale: Locale): boolean => RTL_LOCALES.has(locale);

export const dirFor = (locale: Locale): "ltr" | "rtl" => (isRtl(locale) ? "rtl" : "ltr");

/**
 * Display names, in the language itself.
 *
 * A switcher that lists "Arabic" to someone who reads Arabic is a switcher written for
 * the developer. These match `LANGUAGES` in ./index.ts, which the design system's
 * `LanguageSwitcher` renders.
 */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
  fr: "Français",
  tr: "Türkçe",
  ru: "Русский",
  sw: "Kiswahili",
  es: "Español",
  pt: "Português",
  fa: "فارسی",
  ur: "اردو",
  hi: "हिन्दी",
  bn: "বাংলা",
  id: "Bahasa Indonesia",
  zh: "中文",
  ha: "Hausa",
  yo: "Yorùbá",
  ig: "Igbo",
};

/**
 * BCP 47 tags for `hreflang` and the `lang` attribute.
 *
 * Not always the same as the URL segment: `zh` needs a script subtag to be useful to a
 * search engine, and `hreflang="zh"` alone is ambiguous between Simplified and
 * Traditional.
 */
export const BCP47: Record<Locale, string> = {
  en: "en", ar: "ar", fr: "fr", tr: "tr", ru: "ru", sw: "sw", es: "es", pt: "pt",
  fa: "fa", ur: "ur", hi: "hi", bn: "bn", id: "id", zh: "zh-Hans", ha: "ha",
  yo: "yo", ig: "ig",
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/**
 * The path a locale's version of `path` lives at.
 *
 * `pathFor("/study", "ar")` → `/ar/study`
 * `pathFor("/study", "en")` → `/study`
 */
export function localePath(path: string, locale: Locale): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) return clean;
  return clean === "/" ? `/${locale}` : `/${locale}${clean}`;
}

/**
 * Split a pathname into its locale and the path underneath.
 *
 * `/ar/study` → `{ locale: "ar", path: "/study" }`
 * `/study`    → `{ locale: "en", path: "/study" }`
 *
 * Used by the middleware to rewrite, and by the language switcher to move between
 * locales without losing the page the visitor is on — switching to Arabic from
 * `/universities/bilkent-university` should land on the Arabic version of that page,
 * not on the Arabic homepage.
 */
export function splitLocale(pathname: string): { locale: Locale; path: string } {
  const [, first = "", ...rest] = pathname.split("/");
  if (isLocale(first) && first !== DEFAULT_LOCALE) {
    return { locale: first, path: `/${rest.join("/")}`.replace(/\/$/, "") || "/" };
  }
  return { locale: DEFAULT_LOCALE, path: pathname || "/" };
}
