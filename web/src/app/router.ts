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
 * segment. Those are redirected server-side in next.config.mjs so old links survive.
 */

import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";

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
 */
const PATH_FOR: Record<string, string> = {
  home: "",
  university: "universities",
  service: "services",
  institutions: "institutions",
  blog: "resources",
};

/** The inverse, for reading a route name back out of a pathname. */
const NAME_FOR: Record<string, string> = {
  universities: "university",
  services: "service",
  resources: "blog",
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

  useEffect(() => {
    pushRoute = (route: string) => router.push(pathFor(route));
    return () => {
      pushRoute = null;
    };
  }, [router]);
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
 * Also upgrades the design system's real `#/...` anchors — the navbar, footer and CTA
 * banner all emit them — into client-side transitions. Without that, every link in the
 * chrome would be a full page load.
 */
export function usePlaceholderLinks(): void {
  const router = useRouter();

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!isPlainLeftClick(event)) return;

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.("a[href]");
      if (!anchor) return;

      const href = anchor.getAttribute("href") ?? "";

      const placeholder = resolvePlaceholder(anchor);
      if (placeholder) {
        event.preventDefault();
        router.push(pathFor(placeholder));
        return;
      }

      // The design system's own `#/study`-style links, left over from the hash router.
      if (href.startsWith("#/")) {
        event.preventDefault();
        router.push(pathFor(href));
      }
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [router]);
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
