"use client";

/**
 * Translating the content modules at the point they are rendered.
 *
 * `src/content/*.ts` holds the FAQ answers, the card copy and the section headlines as
 * plain data, and a component renders whatever it is handed: `<Accordion items={s.faq} />`.
 * There is no component inside those modules to call `t()`, so none of their strings were
 * ever translated — 774 of them, while every locale reported full coverage, because the
 * completeness check measures locales against the English catalogue and those strings were
 * in neither.
 *
 * The alternative was wrapping each string where it is displayed. That means finding every
 * field of every content shape at every call site, and the failure mode is silent: miss one
 * and it renders English forever with nothing reporting it. Walking the value once at the
 * boundary covers whole shapes at a time, including ones added later.
 *
 * **The keys below are skipped, and that is the load-bearing part.** A content object mixes
 * things that are *said* with things that are *addressed* — `slug` builds a URL, `icon`
 * names a glyph, `id` is compared against stored records, `kind` is matched in a switch.
 * All of them are strings and several read like prose: `"Medical Tourism"` is a real `id`
 * here. Translate one and the sweep does so faithfully, then the page 404s in Arabic and
 * the icon renders as a blank square.
 *
 * `scripts/i18n-extract.mjs` strips the same key list before harvesting. The two must agree:
 * if this skipped a key the extractor harvested, the string would sit in the catalogue
 * translated and never be looked up — untidy but harmless. The other way round is the real
 * hazard, and it is why the list lives in both files with this note in each.
 */

import { useMemo } from "react";
import { useT } from "./context";
import type { Translator } from "./messages";

/** Keys whose values address something rather than say something. */
export const ADDRESSING_KEYS: ReadonlySet<string> = new Set([
  "id", "slug", "href", "to", "src", "icon", "image", "photo",
  "url", "key", "kind", "tone", "variant", "ref", "code",
]);

/** Only plain data is walked. A class instance or a React element is passed through. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function walk(value: unknown, t: Translator): unknown {
  if (typeof value === "string") return t(value);
  if (Array.isArray(value)) return value.map((entry) => walk(entry, t));

  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      out[key] = ADDRESSING_KEYS.has(key) ? entry : walk(entry, t);
    }
    return out;
  }

  // Numbers, booleans, null, dates, elements: nothing to translate, and copying them
  // would only break referential equality for no gain.
  return value;
}

/**
 * Caches per translator, so a content object is walked once per locale rather than once
 * per render.
 *
 * The content modules are module-level constants, so their identity is stable for the
 * process — which makes them exactly the right key. A `WeakMap` rather than a `Map` so
 * that anything genuinely transient stays collectable.
 */
const caches = new WeakMap<Translator, WeakMap<object, unknown>>();

export function translateContent<T>(value: T, t: Translator): T {
  if (value === null || typeof value !== "object") {
    return (typeof value === "string" ? t(value) : value) as T;
  }

  let cache = caches.get(t);
  if (!cache) {
    cache = new WeakMap();
    caches.set(t, cache);
  }

  const hit = cache.get(value as object);
  if (hit !== undefined) return hit as T;

  const result = walk(value, t) as T;
  cache.set(value as object, result);
  return result;
}

/**
 * The hook form. `tc(services.faq)` returns the same shape with every displayed string
 * translated, and is safe to call inline in a render.
 */
export function useContentT(): <T>(value: T) => T {
  const t = useT();
  return useMemo(() => <T,>(value: T) => translateContent(value, t), [t]);
}
