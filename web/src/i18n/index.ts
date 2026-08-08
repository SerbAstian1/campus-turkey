"use client";

/**
 * Translation.
 *
 * The prototype called a public endpoint with no key and cached results in
 * localStorage. That is fine for a demo and unusable in production: it is rate
 * limited, it leaks page content to a third party on every view, and quality is
 * unreviewable because nobody ever sees the strings.
 *
 * Production model, in order of preference:
 *
 *   1. Static locale files, `src/i18n/locales/<code>.json`, translated once and
 *      reviewed by a human. These ship in the bundle and cost nothing at runtime.
 *   2. The machine fallback below, for strings not yet in a locale file. It goes
 *      through YOUR server route, never straight to a provider, so the key stays
 *      server-side and you can cache, rate-limit and log.
 *
 * Run `npm run i18n:extract` (see scripts/extract-strings.ts) to pull every `t()` key
 * into `locales/en.json`, then send that file for translation. The goal is for the
 * machine fallback to return nothing, because every string is already covered.
 */

import en from "./locales/en.json";

export const LANGUAGES = [
  { code: "EN", label: "English", dir: "ltr" },
  { code: "AR", label: "العربية", dir: "rtl" },
  { code: "FR", label: "Français", dir: "ltr" },
  { code: "TR", label: "Türkçe", dir: "ltr" },
  { code: "RU", label: "Русский", dir: "ltr" },
  { code: "SW", label: "Kiswahili", dir: "ltr" },
  { code: "ES", label: "Español", dir: "ltr" },
  { code: "PT", label: "Português", dir: "ltr" },
  { code: "FA", label: "فارسی", dir: "rtl" },
  { code: "UR", label: "اردو", dir: "rtl" },
  { code: "HI", label: "हिन्दी", dir: "ltr" },
  { code: "BN", label: "বাংলা", dir: "ltr" },
  { code: "ID", label: "Bahasa Indonesia", dir: "ltr" },
  { code: "ZH", label: "中文", dir: "ltr" },
  { code: "HA", label: "Hausa", dir: "ltr" },
  { code: "YO", label: "Yorùbá", dir: "ltr" },
  { code: "IG", label: "Igbo", dir: "ltr" },
] as const;

export type LangCode = (typeof LANGUAGES)[number]["code"];

export type Dictionary = Record<string, string>;

/**
 * Names that must never be translated: the brand, university names, city names,
 * partner organisations, people. A directory that renames universities per language is
 * unusable, because those names appear on application portals and acceptance letters —
 * and a translated company name on an agreement is worse than a missing translation.
 *
 * Keep this list fed from your content, not hand-maintained: see `protectedTerms()`.
 */
export const PROTECTED_LITERALS = [
  "Campus Turkey",
  "Türkiye Bursları",
  "WhatsApp",
  "Change language",
];

/** Every proper noun in the content set, plus the fixed literals above. */
export function protectedTerms(content: {
  universities: { name: string; city: string }[];
  partners?: { org: string; person?: string }[];
}): Set<string> {
  const set = new Set(PROTECTED_LITERALS);
  content.universities.forEach((u) => { set.add(u.name); set.add(u.city); });
  content.partners?.forEach((p) => { set.add(p.org); if (p.person) set.add(p.person); });
  return set;
}

const loaded = new Map<LangCode, Dictionary>([["EN", en as Dictionary]]);

/** Loads a locale file on demand. Missing locales fall back to English, not to a crash. */
export async function loadLocale(code: LangCode): Promise<Dictionary> {
  const cached = loaded.get(code);
  if (cached) return cached;
  try {
    const mod = await import(`./locales/${code.toLowerCase()}.json`);
    const dict = mod.default as Dictionary;
    loaded.set(code, dict);
    return dict;
  } catch {
    return en as Dictionary;
  }
}

/**
 * Machine fallback for strings with no locale entry yet.
 *
 * Points at your own server route, not at a provider. The route holds the key, caches
 * aggressively, and should log every miss — a miss is a string that ought to be in a
 * locale file.
 */
export async function translateMissing(
  strings: string[],
  target: LangCode,
): Promise<Dictionary> {
  if (!strings.length || target === "EN") return {};
  const endpoint = process.env["NEXT_PUBLIC_TRANSLATE_ENDPOINT"];
  if (!endpoint) return {};
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ strings, target }),
  });
  if (!res.ok) return {};
  return (await res.json()) as Dictionary;
}
