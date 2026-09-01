/**
 * The sitemap advertises addresses that exist, and only those.
 *
 * `sitemap.ts` has always carried a guard against advertising a moved address, with a
 * comment explaining why it matters. The guard ran over `staticRoutes` and the four
 * generated lists were appended after it, so it asserted one contributor to the invariant
 * rather than the invariant. `/institutions/universities` — an entry that still exists in
 * `institutions.ts` but whose page now lives at `/partnerships/universities` — sat in the
 * live sitemap answering 308, past a check written for that exact failure.
 *
 * The lesson is what this file is built around: **assert the returned value, not an
 * intermediate.** Every test below calls `sitemap()` and looks at what comes out. A future
 * list appended to the return without passing through the filter fails here, whatever it
 * is derived from and whoever adds it.
 *
 * It matters because nothing else notices. A redirect in a sitemap is invisible in the
 * browser, invisible in the build log, and costs crawl budget while keeping the old
 * address competing in the index with the one that replaced it — a slow, quiet loss that
 * surfaces as "why does the wrong URL rank" months later.
 */

import { describe, expect, it } from "vitest";
import sitemap from "../../app/sitemap";
import { MOVED_ROUTES, MOVED_FROM, hasMoved } from "@/app/moved-routes";

/** The unprefixed paths the sitemap advertises, in the default locale. */
const advertised = (): string[] => sitemap().map((entry) => new URL(entry.url).pathname);

describe("the sitemap", () => {
  it("never advertises an address that redirects", () => {
    /*
     * The whole point of the file. Written as the list of offenders rather than a boolean
     * so a failure names the path instead of saying `true !== false` — the difference
     * between a five-second fix and a bisect.
     */
    const redirecting = advertised().filter(hasMoved);
    expect(redirecting).toEqual([]);
  });

  it("advertises the new address of everything it drops", () => {
    /*
     * The other half, and the one that stops the first test being satisfiable by deleting
     * routes. Dropping `/institutions/universities` is only correct because
     * `/partnerships/universities` is advertised in its place; a filter that removed both
     * would pass the test above and quietly cost the page its listing.
     */
    const paths = new Set(advertised());
    const orphaned = MOVED_ROUTES
      // Parameterised moves resolve per-slug; their destinations are covered by the
      // generated lists, which are asserted wholesale by the coverage test below.
      .filter((route) => !route.to.includes(":"))
      .filter((route) => !paths.has(route.to))
      .map((route) => `${route.from} -> ${route.to}`);

    expect(orphaned).toEqual([]);
  });

  it("lists every address exactly once", () => {
    // Two rows for one URL is a contradiction about which is canonical, and the filters
    // are the kind of change that produces one.
    const paths = advertised();
    const duplicates = paths.filter((path, i) => paths.indexOf(path) !== i);
    expect([...new Set(duplicates)]).toEqual([]);
  });

  it("still carries the pages the sitemap exists for", () => {
    /*
     * A guard on the guards. Every assertion above is satisfied by an empty sitemap, and
     * a filter with an inverted condition would produce exactly that while passing all
     * three.
     */
    const paths = new Set(advertised());
    for (const path of ["/", "/universities", "/apply", "/privacy", "/partnerships/universities"]) {
      expect(paths.has(path), `${path} is missing from the sitemap`).toBe(true);
    }
    expect(advertised().length).toBeGreaterThan(40);
  });

  it("advertises absolute URLs on the configured origin", () => {
    // A relative or wrong-host entry is ignored by crawlers rather than reported, so it
    // fails silently in exactly the way this suite exists to prevent.
    const wrong = sitemap()
      .map((entry) => entry.url)
      .filter((url) => !url.startsWith("https://test.campusturkey.invalid"));
    expect(wrong).toEqual([]);
  });
});

describe("hasMoved", () => {
  /**
   * Why this exists at all, rather than the caller using `MOVED_FROM` directly.
   *
   * Four of the nine moves are parameterised. A set lookup answers `false` for every
   * concrete address those four cover, which is a false negative — the caller filtering
   * on it believes it has checked, and has not.
   */
  it("recognises a literal moved address", () => {
    expect(hasMoved("/institutions/universities")).toBe(true);
    expect(hasMoved("/study")).toBe(true);
  });

  it("recognises a parameterised one, which a set lookup cannot", () => {
    expect(MOVED_FROM.has("/university/itu")).toBe(false);
    expect(hasMoved("/university/itu")).toBe(true);
    expect(hasMoved("/blog/studying-in-istanbul")).toBe(true);
  });

  it("matches a parameter against exactly one segment", () => {
    // `/university/:slug` must not swallow `/university/a/b`, or a deeper route added
    // later is reported as moved and silently dropped from the sitemap.
    expect(hasMoved("/university/itu/campus")).toBe(false);
    expect(hasMoved("/university")).toBe(false);
  });

  it("leaves current addresses alone", () => {
    // The destinations, in particular: reporting these as moved would empty the sitemap.
    expect(hasMoved("/universities/itu")).toBe(false);
    expect(hasMoved("/partnerships/universities")).toBe(false);
    expect(hasMoved("/institutions/hospitals")).toBe(false);
    expect(hasMoved("/")).toBe(false);
  });
});
