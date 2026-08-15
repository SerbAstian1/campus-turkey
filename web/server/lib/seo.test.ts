/**
 * The origin is the one thing every URL on this site is built from.
 *
 * These tests exist because it was once wrong in a way nothing could see. `seo.ts` read
 * `process.env["SITE_ORIGIN"] ?? "https://campusturkey.com"` — bypassing the validation
 * in `config.ts` and falling back to a domain this project does not own. A build with no
 * `SITE_ORIGIN` in its *build* environment succeeded and wrote that domain into every
 * canonical, every `hreflang` pair and all 918 sitemap rows. There was no error, no
 * warning, and no test: a default is indistinguishable from a real value once it is set.
 *
 * So the assertion that matters is not "canonical returns a URL" but "canonical returns
 * *this deployment's* URL". The suite runs with `SITE_ORIGIN` set to an obvious fake by
 * `vitest.config.ts`, which is what makes a hardcoded origin detectable here.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { alternatesFor, canonical } from "./seo";
import { BCP47, DEFAULT_LOCALE, LOCALES, localePath, type Locale } from "@/i18n/locales";

/** The value `vitest.config.ts` puts in the environment. Deliberately not a real site. */
const TEST_ORIGIN = "https://test.campusturkey.invalid";

/**
 * Next types `alternates.languages` by a literal union of BCP-47 tags, so indexing it
 * with a computed `BCP47[locale]` is a type error even though it is exactly what the
 * production code just wrote into it. Read as a plain record in the tests.
 */
const languagesOf = (path: string, locale: Locale): Record<string, string> =>
  (alternatesFor(path, locale)?.languages ?? {}) as Record<string, string>;

describe("canonical", () => {
  it("builds URLs from SITE_ORIGIN rather than a compiled-in default", () => {
    expect(canonical("/")).toBe(`${TEST_ORIGIN}/`);
    expect(canonical("/study")).toBe(`${TEST_ORIGIN}/study`);
  });

  /*
   * The actual regression, and it needs the environment taken away to be visible.
   *
   * A reintroduced `?? "https://campusturkey.com"` is dormant while `SITE_ORIGIN` is
   * set, so no amount of asserting on `canonical()` output under a populated env would
   * catch it — the fallback only speaks when the variable is missing, which is exactly
   * the situation nobody tests. Blanking it and re-importing is what reaches that path.
   *
   * `withoutBlanks` in `config.ts` treats "" as absent, so this exercises the real
   * missing-variable route rather than a synthetic one.
   */
  it("refuses to load without SITE_ORIGIN instead of defaulting to a domain", async () => {
    vi.stubEnv("SITE_ORIGIN", "");
    vi.resetModules();

    await expect(import("./seo")).rejects.toThrow(/SITE_ORIGIN/);
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("alternatesFor", () => {
  it("advertises every locale plus x-default", () => {
    const alternates = alternatesFor("/study", DEFAULT_LOCALE);
    const languages = alternates?.languages ?? {};

    // One entry per locale, and the x-default that decides what a searcher gets when
    // none of the seventeen matches their browser.
    expect(Object.keys(languages)).toHaveLength(LOCALES.length + 1);
    for (const locale of LOCALES) expect(languages).toHaveProperty(BCP47[locale]);
    expect(languages).toHaveProperty("x-default");
  });

  it("emits absolute URLs on the configured origin", () => {
    const alternates = alternatesFor("/study", DEFAULT_LOCALE);

    // A relative hreflang is silently ignored by search engines, which is the failure
    // this guards: the tag is present, looks right in the markup, and does nothing.
    for (const url of Object.values(alternates?.languages ?? {})) {
      expect(url).toMatch(new RegExp(`^${TEST_ORIGIN}/`));
    }
    expect(alternates?.canonical).toMatch(new RegExp(`^${TEST_ORIGIN}/`));
  });

  it("points x-default at the default locale, and each locale at its own path", () => {
    const alternates = alternatesFor("/study", "fr");
    const languages = languagesOf("/study", "fr");

    expect(languages["x-default"]).toBe(canonical(localePath("/study", DEFAULT_LOCALE)));
    expect(languages[BCP47["fr"]]).toBe(canonical(localePath("/study", "fr")));

    // The canonical follows the locale being rendered, while the alternate set does
    // not — every translation of a page advertises the same seventeen siblings.
    expect(alternates?.canonical).toBe(canonical(localePath("/study", "fr")));
  });

  it("gives each locale a distinct URL, so no two compete for the same queries", () => {
    const languages = languagesOf("/study", DEFAULT_LOCALE);

    // x-default duplicates the default locale by design; every other pair must differ.
    const perLocale = LOCALES.map((locale) => languages[BCP47[locale]]);
    expect(new Set(perLocale).size).toBe(LOCALES.length);
  });
});
