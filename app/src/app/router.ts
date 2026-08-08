/**
 * Hash routing, as the prototype does it.
 *
 * The design system's Navbar, Footer, MegaMenuPanel and CTABanner all emit `#/...`
 * hrefs of their own. Routing on the hash means those components work untouched and a
 * plain anchor is a working link everywhere — no interception, and no server rewrite
 * rules needed to deploy to a static host.
 *
 * There is no router library here on purpose: the prototype's routing is fifteen lines
 * and swapping in react-router would change link behaviour, scroll restoration and the
 * page-transition key all at once.
 */

import { useEffect, useState } from "react";

export interface Route {
  /** First path segment. `home` when the hash is empty. */
  name: string;
  /** Everything after it, joined. `null` when there is none. */
  param: string | null;
}

export function parseHash(): Route {
  const raw = window.location.hash.replace(/^#\/?/, "").split("?")[0] ?? "";
  const parts = raw.split("/").filter(Boolean);
  return { name: parts[0] || "home", param: parts.slice(1).join("/") || null };
}

/** Navigate. Mirrors the prototype's `window.CT_GO`. */
export function go(route: string): void {
  window.location.hash = `#/${String(route).replace(/^#?\/?/, "")}`;
}

/** A stable key for the current route, used to re-key the page transition. */
export const routeKey = (r: Route): string => r.name + (r.param ?? "");

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parseHash);

  useEffect(() => {
    const onHash = () => {
      setRoute(parseHash());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return route;
}

/**
 * The design system's navbar and footer ship fixed placeholder hrefs. One delegated
 * listener maps them onto real routes instead of forking the components.
 *
 * The rules are ordered and optionally scoped, because one placeholder is genuinely
 * ambiguous. `Navbar` hardcodes `href="#consultation"` on its secondary button and
 * exposes no prop to change it — only `secondaryLabel`. This app reuses that slot for
 * "Partner Login", so inside the navbar that placeholder means the portal, while
 * everywhere else it still means what it says.
 *
 * The prototype had this right — `Campus Turkey Website.html` line 278 reads
 * `{ "#consultation": "portal", ... }`. The port transcribed it as `"contact"`, which
 * is the entire bug: one word, in a lookup table, for a button whose label had already
 * been changed to say something else.
 *
 * Scoped here rather than remapped globally as the prototype does it, because
 * `CTABanner` defaults its own `secondaryHref` to the same value. Every call site
 * currently passes an explicit one, so nothing relies on that default today — but a
 * banner added later without one would silently send "Book a Consultation" to the
 * partner portal, and that is a trap worth not leaving.
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
 * Exported for its test. This resolution got shipped wrong once — the fix was applied
 * to a `secondaryHref` prop that `Navbar` does not accept, so it typechecked, built,
 * and changed nothing.
 */
export function resolvePlaceholder(anchor: Element): string | null {
  const href = anchor.getAttribute("href") ?? "";
  const rule = PLACEHOLDERS.find(
    (candidate) =>
      candidate.href === href && (!candidate.within || anchor.closest(candidate.within)),
  );
  return rule ? rule.route : null;
}

export function usePlaceholderLinks(): void {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.("a[href]");
      if (!anchor) return;
      const to = resolvePlaceholder(anchor);
      if (!to) return;
      e.preventDefault();
      go(to);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
}
