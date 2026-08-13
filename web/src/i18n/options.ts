"use client";

/**
 * Translated `<Select>` options whose stored value stays English.
 *
 * The design system's `Select` takes a flat `string[]` and uses each entry as both the
 * label and the value. That is fine until the labels are translated, at which point the
 * *stored* value becomes translated too — and every consumer downstream is keyed by
 * English.
 *
 * This is not theoretical. On the contact form, translating the topic list would have
 * missed every key in `TOPIC_ROUTING` and fallen through to `CONTACT`, so a medical
 * enquiry would have reached the general desk and inherited a 730-day retention window
 * instead of 90. On the application form the same mistake sends "Bachelor" to the staff
 * inbox as "Licence" or "学士", which staff filter on and cannot read consistently.
 *
 * So: show the translation, keep the English. One helper rather than the same
 * round-trip written out at every select, because there are a dozen of them across the
 * screens still to migrate and the version that gets written from memory at the tenth
 * one is the version that has the bug.
 *
 * Replace this when the design system's `Select` accepts `{ value, label }` pairs —
 * at which point the mapping belongs there and this file should disappear.
 */

import { useMemo } from "react";
import { useT } from "./context";

export interface TranslatedOptions {
  /** Pass to `<Select options=…>`. */
  options: string[];
  /** Pass to `<Select value=…>`, converting the stored English to what is displayed. */
  display: (english: string) => string;
  /** Convert a selected label back to the English value before storing it. */
  toEnglish: (label: string) => string;
}

/**
 * `english` must be the canonical list — the same strings any lookup table, Zod schema
 * or staff filter is keyed by. Order is preserved, because a select's order is a design
 * decision rather than an alphabetical accident.
 */
export function useTranslatedOptions(english: readonly string[]): TranslatedOptions {
  const t = useT();

  return useMemo(() => {
    const labels = english.map((value) => t(value));

    /*
     * Built as a map rather than searched with `.find()` on every change. It also
     * resolves the collision case deterministically: if two English values happen to
     * translate to the same label, the first wins, which at least keeps the control
     * predictable rather than dependent on iteration order at the call site.
     */
    const backwards = new Map<string, string>();
    english.forEach((value, index) => {
      const label = labels[index] ?? value;
      if (!backwards.has(label)) backwards.set(label, value);
    });

    return {
      options: labels,
      display: (value: string) => (value === "" ? "" : t(value)),
      // An unrecognised label means the stored value and the catalogue disagree — a
      // locale changed under a mounted form. Returning "" empties the field rather than
      // storing a translated string the server cannot interpret.
      toEnglish: (label: string) => backwards.get(label) ?? "",
    };
  }, [english, t]);
}
