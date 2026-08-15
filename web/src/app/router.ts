"use client";

/**
 * Navigation, on real routes.
 *
 * This replaces the hash router the Vite build used. The public surface is deliberately
 * unchanged — `go()`, `useRoute()`, `usePlaceholderLinks()` — so the seventeen screens
 * that call them did not have to be rewritten. What changed is underneath: `go("study")`
 * now pushes `/study` through the Next.js router instead of setting `location.hash`.
 *
 * Handoff note 6 is the reason. Hash routes mean every page shares one URL, one title
 * and one meta description, and for a business whose funnel is organic search on "study
 * in Türkiye" that was the most expensive omission in the document. Note 12 adds the
 * second reason: a hash-routed SPA cannot return a real 404, because every address
 * resolves to the same 200.
 *
 * Route names map to paths one-to-one, except where the prototype used a singular
 * segment. Those are redirected server-side in next.config.ts so old links survive.
 */

import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { localePath } from "@/i18n/locales";
import { useLocale } from "@/i18n/context";

export interface Route {
  /** First path segment. `home` at the root, matching the old hash router. */
  name: string;
  /** Everything after it, joined. `null` when there is none. */
  param: string | null;
}

/**
 * Prototype route name to real path segment.
 *
 * Only the names that differ appear here. `university` → `universities` and
 * `service` → `services` are the two the prototype got singular; `blog` → `resources`
 * is a rename. Every other name is its own path.
 *
 * The last three are the brief's information architecture. Adding them here is what
 * moved three pages without touching the fifteen screens that link to them: `go("study")`
 * and `href="#/partners"` are unchanged at every call site and now resolve to the new
 * addresses. This indirection existing is the reason the move was a two-line diff
 * instead of a search-and-replace across EDSAI's screens — which is what it is for.
 */
const PATH_FOR: Record<string, string> = {
  home: "",
  university: "universities",
  service: "services",
  institutions: "institutions",
  blog: "resources",
  study: "study-in-turkiye",
  partners: "partnerships/agents",
  representative: "partnerships/representatives",
};

/**
 * The inverse, for reading a route name back out of a pathname.
 *
 * Load-bearing beyond tidiness: `Shell` looks the name up in its `ACTIVE` map to decide
 * which navbar item is highlighted. Without `study-in-turkiye → study`, the study page
 * would render with nothing in the navbar marked current — a small wrongness on the
 * page the whole funnel points at.
 *
 * `partnerships` maps to `partners` for both of its children, which is correct: they
 * share one navbar item, and the map's job is the highlight, not the identity.
 */
const NAME_FOR: Record<string, string> = {
  universities: "university",
  services: "service",
  resources: "blog",
  "study-in-turkiye": "study",
  partnerships: "partners",
};

/**
 * Turn a prototype route reference into a real path.
 *
 * Accepts what the screens already pass: `"study"`, `"university/itu"`, `"#/apply"`,
 * and absolute paths. Normalising here rather than at seventeen call sites is what made
 * this migration a change to one file instead of to every screen.
 */
export function pathFor(route: string): string {
  const cleaned = String(route).replace(/^#?\/?/, "");
  if (cleaned === "") return "/";

  const [name = "", ...rest] = cleaned.split("/");
  const segment = PATH_FOR[name] ?? name;
  const tail = rest.filter(Boolean).join("/");

  const path = [segment, tail].filter(Boolean).join("/");
  return `/${path}`;
}

/**
 * The `href` for a link to another page of this site, in the reader's language.
 *
 * Screens used to write `href={`#/university/${slug}`}` and let the delegated click
 * listener rewrite it. That worked for a mouse and for nothing else. The attribute that
 * reached the HTML was still `#/university/…`, which a crawler reads as a fragment of
 * the page it is already on — so every university, service and article page was
 * reachable only through the sitemap, with no internal link pointing at it and no link
 * equity flowing to it. On a site whose whole funnel is organic search, that quietly
 * undid a large part of what moving off the hash router was for.
 *
 * It also cost a redirect. `pathFor` alone yields the unprefixed path, so a reader on
 * `/fr/...` was pushed to `/universities/…` and bounced by the middleware's 307 to
 * `/fr/universities/…` — a round trip on every internal navigation in sixteen of the
 * seventeen languages. Composing `localePath` here means the link points at the right
 * language to begin with.
 *
 * Accepts what the screens already pass: `"apply"`, `"university/itu"`, `"#/apply"`.
 */
export function useHref(): (route: string) => string {
  const locale = useLocale();
  return useMemo(() => (route: string) => localePath(pathFor(route), locale), [locale]);
}

/** Read the current route in the shape the screens expect. */
export function useRoute(): Route {
  const pathname = usePathname() ?? "/";

  return useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    const first = parts[0];
    if (!first) return { name: "home", param: null };
    return {
      name: NAME_FOR[first] ?? first,
      param: parts.slice(1).join("/") || null,
    };
  }, [pathname]);
}

/** A stable key for the current route, used to re-key the page transition. */
export const routeKey = (r: Route): string => r.name + (r.param ?? "");

/**
 * Imperative navigation.
 *
 * `useNavigate()` is the hook form and the one to prefer in new code.
 */
export function useNavigate(): (route: string) => void {
  const router = useRouter();
  return useMemo(() => (route: string) => router.push(pathFor(route)), [router]);
}

/**
 * The bridge that keeps `go()` a free function.
 *
 * Fifteen screens call `go("apply")` at the point of a click. The Next.js router is
 * only reachable from a hook, so strictly this should have become `useNavigate()` in
 * all fifteen — but that is fifteen diffs across EDSAI's screens to change nothing a
 * reader would notice, and every one of them a chance to move a call inside a
 * conditional and break the rules of hooks.
 *
 * Instead the shell mounts `useNavigationBridge()` once and parks the push function
 * here. The cost is a module-level mutable, which is a genuine smell and is why it is
 * confined to these fifteen lines rather than spread around.
 *
 * The fallback matters: before the bridge mounts — or if a screen is ever rendered
 * outside the shell — `go()` still navigates, just with a full document load instead of
 * a client transition. Slower, never broken.
 */
let pushRoute: ((route: string) => void) | null = null;

export function useNavigationBridge(): void {
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
    /*
     * Locale-aware, so that `go("apply")` from `/fr/universities` lands on `/fr/apply`.
     *
     * It used to push the unprefixed path and let the middleware's 307 put the reader
     * back in their own language. That worked, at the cost of a server round trip on
     * every one of the fifty-seven `go()` calls in the screens, in sixteen of the
     * seventeen languages. The bridge is a hook, so the locale is reachable here and
     * the fix is one line rather than fifty-seven.
     */
    pushRoute = (route: string) => router.push(localePath(pathFor(route), locale));
    return () => {
      pushRoute = null;
    };
  }, [router, locale]);
}

/**
 * Send an inbound legacy hash address to its real path, once, on first paint.
 *
 * MIGRATION.md step 3 asks for this and it was never built. A hash is never sent to the
 * server, so `next.config.ts` redirects cannot see `campusturkey.org/#/study` — the
 * request that arrives is for `/`, and the visitor was silently left on the homepage
 * wondering where the page went. Every link shared, bookmarked or published while the
 * prototype was live has that shape.
 *
 * `replace` rather than `push`, so Back returns to wherever they came from rather than
 * to the address that just redirected itself. Runs once: the dependency list is empty on
 * purpose, because this is about how the document was *entered*, not about later
 * navigation.
 */
export function useLegacyHashRedirect(): void {
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith("#/")) return;

    // Strip it from the address before replacing, or the hash survives the transition
    // and this fires again on the next mount.
    const target = localePath(pathFor(hash), locale);
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    router.replace(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Navigate. Same signature the screens have always called. */
export function go(route: string): void {
  const path = pathFor(route);
  if (pushRoute) {
    pushRoute(route);
    return;
  }
  if (typeof window !== "undefined") window.location.assign(path);
}

/**
 * Intercepts the design system's placeholder hrefs and routes them properly.
 *
 * MIGRATION.md step 3 says to delete this hook. That instruction cannot be followed and
 * the document is now wrong about it: the design system hardcodes `#consultation`,
 * `#apply`, `#home` and `#whatsapp` inside components that expose no prop to override
 * them — `Navbar`'s secondary button takes a `secondaryLabel` and no href at all. Until
 * the bundle offers those props, one delegated listener is the alternative to forking
 * the components.
 *
 * What *has* gone is the `#/...` branch this also used to carry. Those were our own
 * links, not the design system's, and rewriting them on click was the wrong layer: the
 * click handler fixed the mouse and left the `href` attribute in the HTML reading
 * `#/university/…`, which is a fragment of the current page to every crawler that saw
 * it. They are now written as real paths at the point they are rendered — see `useHref`
 * — so there is nothing left here to upgrade.
 */
export function usePlaceholderLinks(): void {
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!isPlainLeftClick(event)) return;

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.("a[href]");
      if (!anchor) return;

      const placeholder = resolvePlaceholder(anchor);
      if (placeholder) {
        event.preventDefault();
        router.push(localePath(pathFor(placeholder), locale));
        return;
      }

      /*
       * Real internal links, now that `useHref` writes them into the markup.
       *
       * These two halves answer two different readers and both are needed. The `href`
       * attribute is for the crawler, which reads it and never clicks. This handler is
       * for the person, who clicks and would otherwise get a full document reload —
       * the design system renders plain `<a>` elements, not `next/link`, so without
       * this every navbar, mega-menu, footer and CTA link is a cold page load. That was
       * the one thing the old `#/` interception genuinely bought, and it would have
       * been lost by making the hrefs real.
       *
       * `//evil.com` is not internal. It starts with a slash and is a different origin,
       * which is precisely the advisory class handoff note 14 flags for `?returnTo=`.
       */
      const destination = anchor.getAttribute("href") ?? "";
      const internal = destination.startsWith("/") && !destination.startsWith("//");
      const opensElsewhere =
        anchor.hasAttribute("download") || anchor.getAttribute("target") === "_blank";

      if (internal && !opensElsewhere) {
        event.preventDefault();
        router.push(destination);
      }
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [router, locale]);
}

/**
 * The design system ships components with fixed placeholder hrefs. One delegated
 * listener maps them onto real routes instead of forking the components.
 *
 * The rules are ordered and optionally scoped, because one placeholder is ambiguous.
 * `Navbar` hardcodes `href="#consultation"` on its secondary button and exposes no prop
 * to change it — only `secondaryLabel`. This app reuses that slot for "Partner Login",
 * so inside the navbar that placeholder means the portal, while everywhere else it
 * still means what it says.
 *
 * Scoped rather than remapped globally: `CTABanner` defaults its own `secondaryHref` to
 * the same value. Every call site passes an explicit one today, so nothing relies on
 * that default — but a banner added later without one would silently send "Book a
 * Consultation" to the partner portal.
 */
interface PlaceholderRule {
  href: string;
  /** CSS selector for an ancestor the anchor must sit inside for the rule to apply. */
  within?: string;
  route: string;
}

const PLACEHOLDERS: PlaceholderRule[] = [
  /* Must precede the unscoped `#consultation` rule — first match wins. */
  { href: "#consultation", within: ".ct-desktop-nav", route: "portal" },
  { href: "#consultation", route: "contact" },
  { href: "#home", route: "home" },
  { href: "#apply", route: "apply" },
  { href: "#whatsapp", route: "contact" },
];

/**
 * The route a placeholder anchor should navigate to, or `null` when it is a real link.
 *
 * Exported for its test. This resolution shipped wrong once — the fix was applied to a
 * `secondaryHref` prop that `Navbar` does not accept, so it typechecked, built, and
 * changed nothing.
 */
export function resolvePlaceholder(anchor: Element): string | null {
  const href = anchor.getAttribute("href") ?? "";
  const rule = PLACEHOLDERS.find(
    (candidate) =>
      candidate.href === href && (!candidate.within || anchor.closest(candidate.within)),
  );
  return rule ? rule.route : null;
}

/**
 * True when a click should be left to the browser: a new tab, a new window, a download,
 * or an external link. Intercepting those is the classic way a client router breaks
 * middle-click and cmd-click.
 */
function isPlainLeftClick(event: MouseEvent): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey &&
    !event.defaultPrevented
  );
}

export { PLACEHOLDERS };
export { isPlainLeftClick };
