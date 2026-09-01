/**
 * The route table, checked against the routes that exist.
 *
 * Every move in `MOVED_ROUTES` was verified over HTTP when it was made: 70 checks, all
 * eight moves in four sample locales, every destination resolving. That run proved the
 * redirects work. It cannot prove they still work in six months, and it needed a running
 * server to say anything at all.
 *
 * This does what a server-less test can do, which turns out to be the part that actually
 * regresses: a redirect outlives the page it points at. Somebody renames a directory, the
 * page moves, and the redirect keeps answering 308 into a 404 — a worse outcome than no
 * redirect, because a crawler records the move and then finds nothing at the end of it.
 * Nothing in the type system connects a string in a table to a directory on disk, so this
 * connects them.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MOVED_ROUTES, MOVED_FROM } from "@/app/moved-routes";
import { nav, footerColumns } from "@/content/site";

const APP = join(process.cwd(), "app", "[locale]", "(site)");

/**
 * Does a page exist for this path?
 *
 * A `:slug` in a redirect pattern becomes the `[slug]` directory that serves it, so
 * `/universities/:slug` is satisfied by `universities/[slug]/page.tsx`. Dropping the
 * parameter instead would ask whether `/universities` exists, which is a different
 * question with a different answer — `/institutions` has no index page while
 * `/institutions/[slug]` serves three.
 *
 * A concrete slug matches the same directory. Whether that *value* is real is a content
 * question and `content.test.ts` already owns it; this asks only whether the route is
 * served at all.
 */
function pageExists(path: string): boolean {
  const segments = path.split("/").filter(Boolean);

  const asWritten = segments.map((segment) => (segment.startsWith(":") ? `[${segment.slice(1)}]` : segment));
  if (existsSync(join(APP, ...asWritten, "page.tsx"))) return true;

  // A concrete final segment may be served by a dynamic route.
  if (segments.length > 0) {
    if (existsSync(join(APP, ...asWritten.slice(0, -1), "[slug]", "page.tsx"))) return true;
  }

  return false;
}

describe("moved routes", () => {
  it("every destination is a page that exists", () => {
    const broken = MOVED_ROUTES.filter(({ to }) => !pageExists(to));
    expect(broken.map((route) => `${route.from} -> ${route.to}`)).toEqual([]);
  });

  it("no old address is still served as a page", () => {
    // The half that is easy to get wrong: leaving the page in place *and* adding the
    // redirect gives two live URLs, which is the duplicate content the move was meant to
    // resolve. `/institutions/universities` is the live example — it is excluded from
    // that route's `generateStaticParams` precisely so this stays true.
    const stillServed = MOVED_ROUTES.filter(({ from }) => {
      // A dynamic parent still serves its other slugs, so a `:slug` move cannot be
      // checked this way. Those are covered by the destination check above.
      if (from.includes(":")) return false;
      return existsSync(join(APP, ...from.split("/").filter(Boolean), "page.tsx"));
    });

    expect(stillServed.map((route) => route.from)).toEqual([]);
  });

  it("carries a reason for each move", () => {
    // A redirect with no stated reason is one nobody can ever delete, because nobody
    // knows what it was for.
    for (const route of MOVED_ROUTES) {
      expect(route.reason.length, `${route.from} has no reason`).toBeGreaterThan(20);
    }
  });

  it("never moves an address to another moved address", () => {
    // A chain costs an extra round trip and search engines stop following after a few.
    const chained = MOVED_ROUTES.filter(({ to }) => MOVED_FROM.has(to));
    expect(chained.map((route) => `${route.from} -> ${route.to}`)).toEqual([]);
  });
});

describe("site navigation", () => {
  /**
   * A fragment names a position inside a page, not a page.
   *
   * The footer's "Become a Partner" and "Become a Representative" links carry
   * `#partner-form` and `#rep-form` so they land the reader on the registration form
   * rather than the top of a long marketing page. Both checks below ask about the
   * *page*, so the fragment is stripped before either runs — otherwise `pageExists`
   * looks for a route file named after an anchor and reports a link that is perfectly
   * good.
   */
  const withoutFragment = (path: string): string => path.split("#")[0] ?? path;

  /** Every destination the chrome offers, as unprefixed paths. */
  const destinations = [
    ...nav.filter((entry) => entry.route).map((entry) => `/${entry.route}`),
    ...footerColumns.flatMap((column) => column.links.map((link) => `/${link.route}`)),
  ].map(withoutFragment);

  it("never links to an address that redirects", () => {
    // A nav link into a 308 works and costs every visitor a round trip. It also reads,
    // to a crawler, as the site not believing its own move.
    const stale = destinations.filter((path) => MOVED_FROM.has(path));
    expect([...new Set(stale)]).toEqual([]);
  });

  it("links only to pages that exist", () => {
    /**
     * `portal` lives outside the `(site)` group and is checked separately: it is the one
     * chrome destination that is not a marketing page.
     */
    const missing = destinations
      .filter((path) => path !== "/portal")
      .filter((path) => !pageExists(path));

    expect([...new Set(missing)]).toEqual([]);
  });

  it("has a portal page for the sign-in link", () => {
    expect(existsSync(join(process.cwd(), "app", "[locale]", "portal", "page.tsx"))).toBe(true);
  });
});
