/**
 * A locale may only be advertised if its catalogue can back the claim.
 *
 * **What `hreflang` actually asserts.** It is not a menu of languages the site offers —
 * it tells a search engine *this page is in that language*. A page tagged `hreflang="tr"`
 * whose words are 84% English is a false statement about its own content, and search
 * engines respond by demoting the page or discarding the tag set entirely. The sitemap
 * repeats the same claim, so it draws on the same list.
 *
 * That is audit finding M4: seventeen locales advertised, one delivered. 10,671 of the
 * strings behind those tags did not exist.
 *
 * **Why availability and advertising are separated rather than one list trimmed.** Every
 * locale in `LOCALES` still routes, still appears in the switcher, and still renders
 * whatever has been translated over an English base. Removing them would take working
 * pages away from visitors to fix a problem that only exists in a meta tag. So `LOCALES`
 * stays seventeen and `ADVERTISED_LOCALES` is the honest subset — and this file is what
 * keeps the second one honest, by measuring the files rather than trusting the list.
 *
 * The floor is 90%. Below that a visitor arriving from a search result for their own
 * language lands on a page that is substantially not in it, which is the outcome the tag
 * exists to prevent.
 */

import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  ADVERTISED_LOCALES,
  ADVERTISED_COVERAGE_FLOOR,
  DEFAULT_LOCALE,
  LOCALES,
} from "@/i18n/locales";

const MESSAGES = join(process.cwd(), "src", "i18n", "messages");

/** Every English source string, across every namespace. Keys are the strings themselves. */
function englishKeys(): Set<string> {
  const keys = new Set<string>();
  for (const file of readdirSync(join(MESSAGES, DEFAULT_LOCALE))) {
    if (!file.endsWith(".json")) continue;
    const contents = JSON.parse(readFileSync(join(MESSAGES, DEFAULT_LOCALE, file), "utf8")) as Record<string, string>;
    for (const key of Object.keys(contents)) keys.add(key);
  }
  return keys;
}

/**
 * How much of the English catalogue a locale actually carries.
 *
 * Counts only keys that are present *and* differ from their English source. A catalogue
 * that has been filled with the English text to make a number go up has translated
 * nothing, and this is the measure that says so.
 */
function coverageOf(locale: string, source: Set<string>): number {
  const dir = join(MESSAGES, locale);
  if (!existsSync(dir)) return 0;

  let translated = 0;
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".json") || file.startsWith(".")) continue;
    const contents = JSON.parse(readFileSync(join(dir, file), "utf8")) as Record<string, string>;
    for (const [key, value] of Object.entries(contents)) {
      if (source.has(key) && typeof value === "string" && value.trim() && value !== key) {
        translated++;
      }
    }
  }
  return translated / source.size;
}

const source = englishKeys();

describe("the source catalogue", () => {
  it("is large enough for the measurements below to mean anything", () => {
    // A guard against the walk silently finding nothing, which would make every
    // coverage figure below 0/0 and pass vacuously.
    expect(source.size).toBeGreaterThan(500);
  });
});

describe("every advertised locale", () => {
  it("is a locale the site actually serves", () => {
    for (const locale of ADVERTISED_LOCALES) {
      expect(LOCALES as readonly string[]).toContain(locale);
    }
  });

  it("includes the default, which is the x-default target", () => {
    expect(ADVERTISED_LOCALES as readonly string[]).toContain(DEFAULT_LOCALE);
  });

  it.each(ADVERTISED_LOCALES.filter((l) => l !== DEFAULT_LOCALE))(
    "%s carries enough of the catalogue to claim the page is in it",
    (locale) => {
      const coverage = coverageOf(locale, source);
      expect(
        coverage,
        `${locale} is advertised via hreflang and the sitemap but only ${(coverage * 100).toFixed(1)}% ` +
          `of the catalogue is translated. Either finish it or remove ${locale} from ADVERTISED_LOCALES.`,
      ).toBeGreaterThanOrEqual(ADVERTISED_COVERAGE_FLOOR);
    },
  );
});

describe("the locales held back", () => {
  it("are held back for a measurable reason, not an arbitrary one", () => {
    // The other side of the gate: anything excluded should genuinely be below the floor.
    // If a locale is complete and still not advertised, that is a list somebody forgot to
    // update, and this names it rather than leaving the work invisible.
    const ready: string[] = [];

    for (const locale of LOCALES) {
      if ((ADVERTISED_LOCALES as readonly string[]).includes(locale)) continue;
      if (coverageOf(locale, source) >= ADVERTISED_COVERAGE_FLOOR) ready.push(locale);
    }

    expect(
      ready,
      `These locales now meet the ${ADVERTISED_COVERAGE_FLOOR * 100}% floor and should be added to ` +
        `ADVERTISED_LOCALES: ${ready.join(", ")}`,
    ).toEqual([]);
  });

  it("still route and still render, because availability is not advertising", () => {
    // The distinction this whole file rests on. Turkish is not advertised; Turkish still
    // works. Collapsing the two lists would take working pages away from visitors to fix
    // a problem that lives in a meta tag.
    expect(LOCALES.length).toBeGreaterThan(ADVERTISED_LOCALES.length);
    expect(LOCALES as readonly string[]).toContain("tr");
  });
});
