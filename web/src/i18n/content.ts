/**
 * Translate the prose fields of a content record, leaving everything else alone.
 *
 * `content/*.ts` is plain data — no hooks, so it cannot call `useT()` itself — and the
 * screens that render it do so mostly by spreading whole objects (`<IconCard {...b} />`)
 * or mapping arrays straight onto JSX. Wrapping every individual `{s.title}` at every
 * render site is what the codebase had been doing piecemeal, and it is exactly why most
 * of it was still English: a spread cannot be wrapped at all, and a field is easy to miss
 * across eighteen content files and their consuming screens.
 *
 * This does the wrapping once, at the point each screen reads its content, by walking the
 * record and calling `t()` on every string whose immediate key is in the caller's
 * whitelist — however deep it sits. A flat, explicit whitelist rather than a blanket "any
 * string" walk: a content record also carries slugs, icon names, hex-free but still
 * non-prose values like `"200+"`, routes and real people's names, and translating those
 * is either useless or actively wrong (a name run through a translator is a name gambled).
 * The caller states which keys are prose *for that content module*, because the same key
 * means different things in different places — `name` is a scholarship's title in
 * `study.ts` and a real person's name in a testimonial, and only one of those should ever
 * reach a translator.
 */

export type Translatable = readonly string[];

function walk(value: unknown, key: string | undefined, keys: ReadonlySet<string>, t: (s: string) => string): unknown {
  if (Array.isArray(value)) return value.map((item) => walk(item, key, keys, t));

  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = walk(v, k, keys, t);
    return out;
  }

  if (typeof value === "string" && key !== undefined && keys.has(key)) return t(value);
  return value;
}

/**
 * `t` is a plain `(english: string) => string` — pass the translator from `useT()`, or
 * `identity` from `i18n/messages` to collect strings unchanged (see the extraction script).
 */
export function translateContent<T>(value: T, t: (s: string) => string, keys: Translatable): T {
  return walk(value, undefined, new Set(keys), t) as T;
}

/**
 * The strings `translateContent` would translate, without translating them.
 *
 * `t(x.field)` can never be extracted by scanning source — the argument is a variable,
 * not a literal, and by the time this runs it could hold any of forty universities'
 * worth of copy. This walks the same content the same way, with the same whitelist, and
 * collects what it finds instead of replacing it — which is how those strings reach
 * `en/content.json` at all. Used by `scripts/i18n-collect-content.mjs`, never at runtime.
 */
export function collectContentStrings<T>(value: T, keys: Translatable, into: Set<string> = new Set()): Set<string> {
  translateContent(value, (s) => {
    into.add(s);
    return s;
  }, keys);
  return into;
}

/**
 * The prose keys `content/services.ts` uses, shared between the listing page and the
 * detail page so the two lists cannot drift apart and leave one of them stale.
 */
export const SERVICE_KEYS: Translatable = [
  "eyebrow", "title", "lead", "cta", "label", "description", "body",
  "meta", "item", "items", "note", "tags", "trust", "question", "answer",
];

/** The prose keys `content/institutions.ts` uses. */
export const INSTITUTION_KEYS: Translatable = ["eyebrow", "title", "lead", "cta", "label", "description", "body", "list"];
