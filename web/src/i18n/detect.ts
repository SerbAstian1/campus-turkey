/**
 * Which locale a visitor should get, when the URL does not say.
 *
 * The URL stays authoritative — `/ar/study` is Arabic, always, and nothing here can
 * override it. This answers the narrower question the unprefixed entry point raises:
 * somebody has arrived at `/study` and we have to decide whether that means English or
 * whether they would rather read it in Urdu.
 *
 * Order of authority, strongest first:
 *
 *   1. An explicit locale in the URL          — handled by the caller; never reaches here
 *   2. The preference cookie                  — a choice this person actually made
 *   3. `Accept-Language`                      — a guess, and only on a first visit
 *   4. English
 *
 * Rule 2 above rule 3 is the requirement that matters: a visitor who picked English on
 * a Turkish browser must keep getting English. Detection is for people who have not
 * chosen, and it must never argue with someone who has.
 *
 * No React and no Next imports: this runs in the edge middleware.
 */

import { DEFAULT_LOCALE, isLocale, LOCALES, type Locale } from "./locales";

/**
 * The cookie that remembers a choice.
 *
 * `NEXT_LOCALE` is the name Next's own i18n tooling uses. Borrowed deliberately — if
 * this app ever adopts a framework feature or a CDN rule that knows about locales, it
 * will already be looking for this name.
 */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** A year. Long enough that a returning visitor is remembered across a whole intake cycle. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Best supported match for an `Accept-Language` header.
 *
 * Quality-ordered, and matches the base subtag as well as the exact tag: a browser
 * sending `pt-BR` should get Portuguese rather than falling through to English, and
 * `zh-Hans-CN` should get `zh`. Region-specific catalogues do not exist here, so
 * collapsing to the base language is the correct behaviour rather than a shortcut.
 *
 * Returns `null` when nothing matches, so the caller can distinguish "they want English"
 * from "we have no idea" — those deserve different treatment even though both end up
 * rendering English.
 */
export function matchAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null;

  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      const quality = q ? Number.parseFloat(q.split("=")[1] ?? "1") : 1;
      return { tag: (tag ?? "").trim().toLowerCase(), quality: Number.isNaN(quality) ? 0 : quality };
    })
    .filter((entry) => entry.tag !== "" && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality);

  for (const { tag } of ranked) {
    if (tag === "*") continue;
    if (isLocale(tag)) return tag;

    const base = tag.split("-")[0] ?? "";
    if (isLocale(base)) return base;
  }

  return null;
}

/** A cookie value, accepted only if it is still a locale this site serves. */
export function localeFromCookie(value: string | null | undefined): Locale | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  return isLocale(trimmed) ? trimmed : null;
}

export interface DetectionInput {
  cookie?: string | null;
  acceptLanguage?: string | null;
}

export interface Detection {
  locale: Locale;
  /** What decided it. Carried so the caller can choose whether a redirect is warranted. */
  source: "cookie" | "header" | "default";
}

/**
 * Resolve a locale for a request with no locale in its URL.
 *
 * Separated from the middleware so it is testable without constructing a `NextRequest`,
 * and so the precedence rule lives somewhere a reader can check it against the comment
 * above rather than inferring it from control flow.
 */
export function detectLocale(input: DetectionInput): Detection {
  const fromCookie = localeFromCookie(input.cookie);
  if (fromCookie) return { locale: fromCookie, source: "cookie" };

  const fromHeader = matchAcceptLanguage(input.acceptLanguage);
  if (fromHeader) return { locale: fromHeader, source: "header" };

  return { locale: DEFAULT_LOCALE, source: "default" };
}

/** Every locale, for anything that needs to enumerate them without importing the tuple. */
export const SUPPORTED: readonly Locale[] = LOCALES;
