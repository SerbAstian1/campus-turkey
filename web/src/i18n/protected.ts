/**
 * Content that is allowed to be identical in every locale.
 *
 * The completeness gate treats an entry whose translation equals its English source as
 * *untranslated* — that is the whole point of the gate, because copying English into
 * seventeen files is the failure it exists to catch. A handful of strings legitimately
 * do not change, and without a way to say so they would either fail the gate forever or
 * force someone to weaken it.
 *
 * **Being hard to translate is not a reason to be in this file.** Every category below
 * is deliberate and carries the reason it exists. A string lands here because
 * translating it would be *wrong*, not because nobody got to it.
 */

import type { Locale } from "./locales";

/** Why a string is exempt. Recorded so the list can be re-argued later, not just trusted. */
export type ProtectedReason =
  | "brand"
  | "official-name"
  | "person"
  | "technical"
  | "url-or-address"
  | "identifier"
  | "same-in-target";

export interface ProtectedEntry {
  value: string;
  reason: ProtectedReason;
  /**
   * Locales where the exemption does **not** apply, if any.
   *
   * "WhatsApp" is a brand everywhere; "Campus Turkey" is a company name everywhere. But
   * a term that is genuinely identical in French and different in Arabic belongs here
   * with the locales that must still translate it, rather than being globally exempt.
   */
  exceptLocales?: Locale[];
}

/**
 * The exemptions themselves live in `protected.json`.
 *
 * Data rather than code, because two very different consumers need exactly the same
 * answer: this module, and `scripts/i18n-check.mjs`, which is plain Node and cannot
 * import TypeScript. The first attempt had the checker parse the regex literals out of
 * this file with a regex, which broke on the first pattern containing a `/` inside a
 * character class — a good sign that the data wanted to be data.
 *
 * The large sets — university names, city names, partner organisations, people — are
 * deliberately absent. They are *content*, and a hand-maintained copy of content
 * drifts; they come from `protectedFromContent()` instead.
 */
import data from "./protected.json";

export const PROTECTED_ENTRIES: readonly ProtectedEntry[] = data.entries.map((e) => ({
  value: e.value,
  reason: e.reason as ProtectedReason,
}));

/**
 * Patterns that are structurally non-translatable whatever they contain.
 *
 * Anchored at both ends, always: "Email us" must not be exempted because it contains
 * the word "Email", and a sentence containing a URL is still a sentence.
 */
export const PROTECTED_PATTERNS: readonly { pattern: RegExp; reason: ProtectedReason }[] =
  data.patterns.map((p) => ({
    pattern: new RegExp(p.source, p.flags),
    reason: p.reason as ProtectedReason,
  }));

/**
 * Proper nouns drawn from the content set rather than hand-listed.
 *
 * University and city names are the reason this function exists. `PROTECTED_LITERALS`
 * in `i18n/index.ts` made the same argument and this replaces it: a directory that
 * renames universities per language is unusable, because those names appear on
 * application portals and acceptance letters. A translated institution name on an
 * agreement is worse than no translation at all.
 *
 * Transliteration for Arabic, Persian and Urdu is a real question and deliberately not
 * answered here — it is a client and product decision, recorded in the i18n report
 * rather than implemented by inference.
 */
export function protectedFromContent(content: {
  universities: readonly { name: string; city: string }[];
  partners?: readonly { org: string; person?: string }[];
}): Set<string> {
  const set = new Set<string>();
  for (const u of content.universities) {
    set.add(u.name);
    set.add(u.city);
  }
  for (const p of content.partners ?? []) {
    set.add(p.org);
    if (p.person) set.add(p.person);
  }
  return set;
}

/** Is this string exempt from translation, for this locale? */
export function isProtected(
  value: string,
  locale: Locale,
  extra?: ReadonlySet<string>,
): boolean {
  const trimmed = value.trim();
  if (trimmed === "") return false;

  if (extra?.has(trimmed)) return true;

  for (const entry of PROTECTED_ENTRIES) {
    if (entry.value !== trimmed) continue;
    if (entry.exceptLocales?.includes(locale)) return false;
    return true;
  }

  return PROTECTED_PATTERNS.some(({ pattern }) => pattern.test(trimmed));
}

/** The reason, for the gate's report. `null` when the string is not protected. */
export function protectionReason(value: string): ProtectedReason | null {
  const trimmed = value.trim();
  const entry = PROTECTED_ENTRIES.find((e) => e.value === trimmed);
  if (entry) return entry.reason;
  return PROTECTED_PATTERNS.find(({ pattern }) => pattern.test(trimmed))?.reason ?? null;
}
