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

  /*
   * A set, not a counter.
   *
   * 24 strings appear in two namespaces each — "Services" is in both common.json and
   * site.json — and the English side dedupes them because it builds a Set. Counting
   * occurrences on this side compared 734 against a denominator of 709 and reported
   * locales at 103.5%, which made the 90% floor behave like about 87%. A measurement
   * that can exceed 100% is not measuring what its name says.
   */
  const translated = new Set<string>();
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".json") || file.startsWith(".")) continue;
    const contents = JSON.parse(readFileSync(join(dir, file), "utf8")) as Record<string, string>;
    for (const [key, value] of Object.entries(contents)) {
      if (source.has(key) && typeof value === "string" && value.trim() && value !== key) {
        translated.add(key);
      }
    }
  }
  return translated.size / source.size;
}

/**
 * How much of a locale's catalogue came from a machine and has not been read by a person.
 *
 * `scripts/i18n-machine-translate.mjs` writes `<locale>/.machine.json` listing exactly the
 * keys it produced, which makes "translated" and "reviewed" separable facts rather than one
 * assumption. Returns 0 where no manifest exists — a locale filled by hand, or one nobody
 * has swept, has nothing outstanding by this measure.
 */
function machineShareOf(locale: string, source: Set<string>): number {
  const manifest = join(MESSAGES, locale, ".machine.json");
  if (!existsSync(manifest)) return 0;

  const parsed = JSON.parse(readFileSync(manifest, "utf8")) as { keys?: string[] };
  const keys = (parsed.keys ?? []).filter((key) => source.has(key));
  return new Set(keys).size / source.size;
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

/**
 * How much of a catalogue may still be unreviewed machine output before the locale counts
 * as merely filled rather than finished.
 *
 * Ten percent, so a handful of machine strings left in an otherwise reviewed catalogue does
 * not hold the whole locale back, while a wholesale sweep plainly does.
 */
const MACHINE_SHARE_CEILING = 0.1;

describe("the locales held back", () => {
  it("are held back for a measurable reason, not an arbitrary one", () => {
    /*
     * The other side of the gate: nothing finished should sit unadvertised because a list
     * went stale. This names it rather than leaving the work invisible.
     *
     * Coverage alone used to answer that, because a filled catalogue could only have been
     * filled by a person. `i18n-machine-translate.mjs` broke that equivalence — a locale
     * can now reach 100% in an afternoon without anyone having read a word of it — so there
     * are three states where there were two: thin, filled-but-unreviewed, and reviewed.
     * Only the third belongs in `hreflang`, because the tag asserts the page *is* in that
     * language and a machine draft is not yet a claim worth making to a search engine.
     *
     * So a locale is held back legitimately when it is either below the floor or still
     * mostly machine output, and the manifest each sweep writes is what tells them apart.
     * Get a locale reviewed, delete or shrink its `.machine.json`, and this test starts
     * asking for it by name again — which is the nudge the original assertion existed to
     * provide, now pointed at the step that actually remains.
     */
    const ready: string[] = [];

    for (const locale of LOCALES) {
      if ((ADVERTISED_LOCALES as readonly string[]).includes(locale)) continue;
      if (coverageOf(locale, source) < ADVERTISED_COVERAGE_FLOOR) continue;
      if (machineShareOf(locale, source) > MACHINE_SHARE_CEILING) continue;
      ready.push(locale);
    }

    expect(
      ready,
      `These locales meet the ${ADVERTISED_COVERAGE_FLOOR * 100}% floor and are substantially ` +
        `reviewed, so they should be added to ADVERTISED_LOCALES: ${ready.join(", ")}`,
    ).toEqual([]);
  });

  it("distinguishes a catalogue that is filled from one that is finished", () => {
    /*
     * Guards the exemption above from becoming a blanket excuse. If a locale is at or above
     * the floor, it must be able to say *why* it is still held back — and "most of it came
     * out of a machine an hour ago" is only a reason while the manifest says so.
     *
     * Without this, deleting the manifests would silently reopen the hole the exemption was
     * cut for, and the suite would go on passing.
     */
    const filled = LOCALES.filter(
      (locale) =>
        !(ADVERTISED_LOCALES as readonly string[]).includes(locale) &&
        coverageOf(locale, source) >= ADVERTISED_COVERAGE_FLOOR,
    );

    for (const locale of filled) {
      expect(
        machineShareOf(locale, source),
        `${locale} is complete but not advertised, and carries no .machine.json to explain why. ` +
          `Either it was reviewed — in which case advertise it — or the manifest was lost.`,
      ).toBeGreaterThan(MACHINE_SHARE_CEILING);
    }
  });

  it("still route and still render, because availability is not advertising", () => {
    // The distinction this whole file rests on. Turkish is not advertised; Turkish still
    // works. Collapsing the two lists would take working pages away from visitors to fix
    // a problem that lives in a meta tag.
    expect(LOCALES.length).toBeGreaterThan(ADVERTISED_LOCALES.length);
    expect(LOCALES as readonly string[]).toContain("tr");
  });
});
