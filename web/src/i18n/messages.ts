/**
 * The message catalogue.
 *
 * One design decision governs everything here: **the English string is the key.**
 *
 *   t("Study in Türkiye")  →  "الدراسة في تركيا"
 *
 * Not `t("home.hero.title")`. The consequences are worth stating because they are the
 * whole reason the extraction of ~15,500 words is feasible at all:
 *
 *   - A missing translation falls back to the key, and the key is correct English. A
 *     half-translated site reads as a partly-English site rather than as
 *     `home.hero.title` printed on a page. That is what makes it safe to ship the
 *     routing before a single word is translated.
 *   - Extraction is mechanical. Nobody invents a key, and nobody has to keep a key and
 *     its English text in step, which is where keyed catalogues rot.
 *   - Changing the English copy invalidates its translations automatically, because the
 *     key changed. That is the correct behaviour: a changed sentence needs re-translating,
 *     and a keyed system would silently keep serving the translation of the old one.
 *
 * The cost is a larger catalogue and duplicate entries for strings that are identical
 * in English but should differ by context. Neither has bitten this site; if one does,
 * the escape hatch is a `context` argument, not a switch to opaque keys.
 */

import type { Locale } from "./locales";
import { DEFAULT_LOCALE } from "./locales";

/** `{ "Study in Türkiye": "الدراسة في تركيا" }` */
export type Messages = Record<string, string>;

/**
 * Load a locale's catalogue.
 *
 * Server-side only, and deliberately: shipping 17 catalogues to the browser would put
 * every language in the bundle to serve one. Each locale's page is rendered on the
 * server with its own messages, so the browser receives exactly the strings it displays.
 *
 * A missing file is not an error. Locales are added to `LOCALES` before their
 * translations exist — that is the normal state during a rollout — and the fallback
 * renders correct English.
 */
/**
 * The namespaces a locale's catalogue is split across.
 *
 * Split by who translates it and when, rather than by module graph: a translator
 * working through the forms pack should not have the marketing copy in front of them,
 * and the staff console is not here at all because it stays English by decision.
 *
 * Listed rather than globbed. A glob would silently stop covering a namespace whose
 * file was renamed, and a missing namespace is a page of untranslated UI rather than an
 * error — exactly the failure the completeness gate exists to make visible.
 */
export const NAMESPACES = [
  "common",
  "site",
  "forms",
  "portal",
  "errors",
  "seo",
  "content",
] as const;

export type Namespace = (typeof NAMESPACES)[number];

export async function loadMessages(locale: Locale): Promise<Messages> {
  if (locale === DEFAULT_LOCALE) return {};

  /*
   * Namespaces are merged into one flat catalogue before they reach the translator,
   * so `t()` stays a single-argument call. Keys are the English source strings and are
   * therefore globally unique by construction — the namespace is an authoring and
   * review boundary, not a lookup one, and making call sites name it would be asking
   * every developer to remember a filing decision.
   *
   * A missing namespace file is not an error. Locales are registered before their
   * translations exist, which is the normal state during a rollout, and the fallback
   * renders correct English. The gate is what refuses to call that shippable.
   */
  const loaded = await Promise.all(
    NAMESPACES.map(async (namespace) => {
      try {
        const mod = (await import(`./messages/${locale}/${namespace}.json`)) as {
          default: Messages;
        };
        return mod.default;
      } catch {
        return {};
      }
    }),
  );

  return Object.assign({}, ...loaded) as Messages;
}

/**
 * Build a translator over a catalogue.
 *
 * `t(english)` returns the translation, or the English it was given.
 *
 * Interpolation uses `{name}` placeholders. It is intentionally the only formatting
 * feature: plurals and dates belong to `Intl`, which every locale here already has, and
 * a bespoke plural system is a large amount of machinery for a site whose copy has
 * almost none.
 */
export function createTranslator(messages: Messages) {
  return function t(english: string, values?: Record<string, string | number>): string {
    const translated = messages[english] ?? english;
    if (!values) return translated;

    return translated.replace(/\{(\w+)\}/g, (whole, name: string) =>
      name in values ? String(values[name]) : whole,
    );
  };
}

export type Translator = ReturnType<typeof createTranslator>;

/**
 * The translator for a locale, on the server.
 *
 * `useT()` is a client hook and cannot reach `generateMetadata`, which is where a page's
 * `<title>` and meta description are decided. That is exactly the copy that most needs
 * translating: it is what a search engine indexes and what a reader sees in a result
 * before they ever load the page, and until this existed all seventeen locales served
 * the same English titles under correct `hreflang` — advertising a French page and
 * handing Google an English one.
 *
 * English returns the identity translator, because `loadMessages` short-circuits to an
 * empty catalogue and every key is already its own English text.
 */
export async function getTranslator(locale: Locale): Promise<Translator> {
  return createTranslator(await loadMessages(locale));
}

/** The identity translator, for English and for tests. */
export const identity: Translator = createTranslator({});
