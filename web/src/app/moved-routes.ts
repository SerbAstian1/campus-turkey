/**
 * Addresses that used to be somewhere else.
 *
 * The brief's information architecture groups the site into `/services/*`,
 * `/partnerships/*` and `/study-in-turkiye/*`. The prototype published a flatter shape,
 * and handoff note 6 is explicit that those addresses are already in circulation — so
 * every one of them has to keep working.
 *
 * One table, read by three things that would otherwise drift apart:
 *
 *   - `next.config.ts` turns it into 308 redirects, unprefixed and for all 17 locales
 *   - `sitemap.ts` excludes the old paths, so the sitemap only advertises the new ones
 *   - the route-move test asserts every entry actually resolves
 *
 * Written as data rather than as forty hand-written redirect objects because the locale
 * dimension multiplies it: seventeen languages times each move is the kind of list
 * nobody maintains correctly by hand, and a missed locale is a 404 for the visitors
 * least able to work around it.
 *
 * 308 rather than 302: the move is permanent, and 308 preserves the request method
 * where 301 historically did not. Search engines treat both as permanent.
 */

export interface MovedRoute {
  /** The published address. No locale prefix — that dimension is added by the consumer. */
  from: string;
  to: string;
  /** Why it moved. Read by whoever wonders whether the redirect can be deleted. */
  reason: string;
}

export const MOVED_ROUTES: readonly MovedRoute[] = [
  {
    from: "/study",
    to: "/study-in-turkiye",
    reason:
      "The brief's path, and the phrase the funnel actually depends on. 'Study in Türkiye' is the search term this business ranks for; '/study' says nothing about where.",
  },
  {
    from: "/partners",
    to: "/partnerships/agents",
    reason:
      "'/partners' described three different relationships at one address: recruitment agents, country representatives and universities. Each now has its own page, and the agents' page is what the old address meant.",
  },
  {
    from: "/representative",
    to: "/partnerships/representatives",
    reason: "Grouped under partnerships, and plural to match every other collection on the site.",
  },
  {
    from: "/institutions/universities",
    to: "/partnerships/universities",
    reason:
      "A university partnership is a partnership. The other three institution pages stay where they are: they describe what Campus Turkey does for a hospital or a chamber, not a commercial relationship a reader can enter into from the page.",
  },

  /**
   * The prototype's singular segments. These predate the brief and were already
   * redirected in `next.config.ts`; they live here now so that the locale-prefixed
   * forms are covered too — `/ar/university/itu` was a 404 before this table existed.
   */
  { from: "/university/:slug", to: "/universities/:slug", reason: "The prototype used a singular segment." },
  { from: "/service/:slug", to: "/services/:slug", reason: "The prototype used a singular segment." },
  { from: "/institution/:slug", to: "/institutions/:slug", reason: "The prototype used a singular segment." },
  { from: "/blog/:slug", to: "/resources/:slug", reason: "Renamed: these are guides, not posts, and are not dated." },
  { from: "/blog", to: "/resources", reason: "Renamed: these are guides, not posts, and are not dated." },
];

/** Every address that has moved, for the sitemap to exclude. */
export const MOVED_FROM = new Set(MOVED_ROUTES.map((route) => route.from));
