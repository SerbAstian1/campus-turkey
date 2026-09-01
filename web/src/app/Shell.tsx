"use client";

/**
 * The site chrome: navbar, footer, WhatsApp action, toasts, error and offline guards.
 *
 * Transcribed from `App.tsx` in the Vite build. What changed is only what had to:
 * the route now comes from the pathname rather than the hash, and the screen is
 * `children` supplied by the Next.js layout rather than the return value of a switch.
 * Everything visual is unchanged.
 *
 * The portal does not use this — it is an application with its own navigation, and it
 * has its own layout.
 */

import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from "react";
import { Footer, Navbar, ScrollProgress, ASSETS } from "@/ds";
import { footerColumns, contact, socials, nav } from "@/content";
import { useT } from "@/i18n/context";
import { useLocaleSwitch } from "@/i18n/switch";
import { WhatsAppAction } from "@/components/Common";
import { ErrorScreen, OfflineGuard } from "@/screens/Errors";
import { MobileNav } from "./MobileNav";
import { useMega } from "./mega";
import { routeKey, useRoute, usePlaceholderLinks, useNavigationBridge, useLegacyHashRedirect, useHref, go } from "./router";
import { subscribeToToasts } from "./toast";

/**
 * Next.js signals `notFound()` and `redirect()` by throwing.
 *
 * Both are control flow, not failure — the framework catches them upstream and turns
 * them into a 404 response or a 307. An error boundary that catches everything
 * intercepts them first, and the symptom is quiet and bad: an unknown university slug
 * renders "something went wrong" with a **200 status**, so every soft 404 the routing
 * migration existed to eliminate comes straight back, and every `redirect()` stops
 * redirecting.
 *
 * The marker is `digest`. Next has spelled it `NEXT_NOT_FOUND` and, more recently,
 * `NEXT_HTTP_ERROR_FALLBACK;404`; both are matched so this keeps working across an
 * upgrade rather than failing silently again.
 */
function isFrameworkControlFlow(error: unknown): boolean {
  const digest = (error as { digest?: unknown })?.digest;
  if (typeof digest !== "string") return false;
  return (
    digest === "NEXT_NOT_FOUND" ||
    digest.startsWith("NEXT_REDIRECT") ||
    digest.startsWith("NEXT_HTTP_ERROR_FALLBACK")
  );
}

/**
 * A failing screen degrades to a recoverable panel instead of blanking the site.
 *
 * Exported for its test — the control-flow rule above is the kind of thing that gets
 * "simplified" back out during a refactor, and the symptom is a 200 status nobody looks
 * at.
 */
export class RouteBoundary extends Component<
  { routeKey: string; children: ReactNode },
  { failed: boolean; detail: string | null }
> {
  constructor(props: { routeKey: string; children: ReactNode }) {
    super(props);
    this.state = { failed: false, detail: null };
  }

  static getDerivedStateFromError(error: unknown) {
    // Re-thrown rather than handled: this is the framework asking for a 404 or a
    // redirect, and swallowing it produces a 200 that says "error".
    if (isFrameworkControlFlow(error)) throw error;
    return { failed: true, detail: error instanceof Error ? error.message : null };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    if (isFrameworkControlFlow(error)) throw error;
    // Wire this to error tracking before launch — handoff note 12. Until then the
    // console is the only record, which is exactly the gap that note describes.
    console.error("Route failed:", error, info);
  }

  componentDidUpdate(prev: { routeKey: string }) {
    if (prev.routeKey !== this.props.routeKey && this.state.failed) {
      this.setState({ failed: false, detail: null });
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <ErrorScreen state="failed" detail={this.state.detail} />;
  }
}

/* Which navbar item reads as active for a given route. */
const ACTIVE: Record<string, string> = {
  study: "Study in Türkiye",
  universities: "Universities",
  university: "Universities",
  service: "Services",
  partners: "Partners",
  representative: "Partners",
  institutions: "Partners",
  portal: "Partners",
  about: "About",
};

export function Shell({ children }: { children: ReactNode }) {
  const route = useRoute();
  const t = useT();
  const href = useHref();
  const [lang, setLanguage] = useLocaleSwitch();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [narrow, setNarrow] = useState(false);

  // Parks the router so the free `go()` the screens call can reach it.
  useNavigationBridge();
  usePlaceholderLinks();
  // Rescues inbound `#/study`-style links published while the prototype was live.
  useLegacyHashRedirect();

  /*
   * The runtime translation sweep is gone.
   *
   * It walked the DOM after every render and machine-translated text nodes in place.
   * Handoff note 7 called that "a measurable interaction cost" on the directory, note 8
   * flagged its unbounded cache, and — decisively — it translated the page only *after*
   * hydration, so every crawler saw English no matter which language the visitor chose.
   *
   * Translation now happens on the server, per locale, before the HTML is sent.
   */

  useEffect(() => subscribeToToasts(setToastMessage), []);

  useEffect(() => {
    // Read after mount rather than during render: `window` does not exist on the
    // server, and initialising from it would make the first client render disagree
    // with the server's HTML.
    const onResize = () => setNarrow(window.innerWidth < 1180);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* The design system's Icon draws through lucide on mount; re-running the sweep after
     each render catches icons in subtrees that mounted this pass. */
  useEffect(() => {
    window.lucide?.createIcons();
  });

  const { name } = route;
  const key = routeKey(route);

  const navLabels: Record<string, string> = {
    study: t("Study in Türkiye"),
    universities: t("Universities"),
    Services: t("Services"),
    Partners: t("Partners"),
    about: t("About"),
  };

  const mega = useMega();

  const navItems = nav.map((n) => ({
    label: n.route ? (navLabels[n.route] ?? n.label) : (navLabels[n.label] ?? n.label),
    href: n.route ? href(n.route) : undefined,
    children: n.mega ? mega[n.mega] : undefined,
    _route: n.route,
  }));

  const footerTitles: Record<string, string> = {
    Education: t("Education"),
    Services: t("Services"),
    Partners: t("Partners"),
    Company: t("Company"),
  };

  return (
    /*
     * `id="root"` is load-bearing, and not a leftover.
     *
     * `styles/base.css` was transcribed from the prototype rule for rule, and the
     * prototype mounted React into `<div id="root">`, so eight of its rules are scoped
     * to `#root`. This application reproduced the prototype's DOM faithfully and dropped
     * that one attribute, which silently disabled every one of them — CSS does not report
     * a selector that matches nothing.
     *
     * The most expensive was the mobile navigation switch. At 768px and below,
     * `#root>div>header{display:none}` is what removes the desktop header so the compact
     * bar can replace it. With the id gone the rule never fired, both navigations
     * rendered, and the desktop header pushed every page wider than the viewport: on a
     * 360px phone the heading, the body copy and the buttons were all clipped mid-word.
     * That is the "looks broken on mobile" report, and it was one attribute.
     *
     * Also restored by this: the navbar's overflow guard for long translated labels, the
     * mega-menu height fix, the reduced top padding on phones, and the hover
     * neutralisation on touch screens.
     *
     * Restoring the id rather than rewriting the eight selectors is deliberate. This
     * file's own header says to keep it in step with the prototype and that a dropped
     * rule is a visual regression that no test will catch; re-pointing the selectors
     * would take it further from the document it is meant to mirror. The element that
     * carries the id has to be this one, because `#root>div>header` counts depth from
     * here.
     */
    <div id="root">
      <a className="ct-skip" href="#main">{t("Skip to content")}</a>
      <ScrollProgress />

      <MobileNav lang={lang} onLangChange={setLanguage} route={key} />
      <div className="ct-desktop-nav">
        <Navbar
          items={navItems}
          activeItem={ACTIVE[name]}
          lang={lang}
          onLangChange={setLanguage}
          assetBase={ASSETS}
          ctaLabel={t("Apply Now")}
          ctaHref={href("apply")}
          /* The design system hardcodes this button's destination to
             `href="#consultation"` and exposes no prop to change it — only the label.
             `usePlaceholderLinks` resolves it to the portal when the click comes from
             inside the navbar. See the rule table in ./router. */
          secondaryLabel={narrow ? "" : t("Login")}
          onSelect={(item, e) => {
            /* A group trigger has no destination. Without this it falls through to the
               design system's placeholder href and navigates away, which is the only
               way into the menu on a touch device. */
            if (item.children && !item.href) { e?.preventDefault(); return; }
            if (item.href) { e?.preventDefault(); go(item.href); }
          }}
        />
      </div>

      <main id="main" className="ct-page" key={key}>
        <OfflineGuard>
          <RouteBoundary routeKey={key}>{children}</RouteBoundary>
        </OfflineGuard>
      </main>

      <Footer
        columns={footerColumns.map((c) => ({
          title: footerTitles[c.title] ?? c.title,
          links: c.links.map((l) => ({ label: l.label, href: href(l.route) })),
        }))}
        contact={contact}
        socials={socials}
        lang={lang}
        onLangChange={setLanguage}
        assetBase={ASSETS}
        legal="© 2026 Campus Turkey. Your guide to study in Turkey."
        /*
         * The footer photograph, darkened.
         *
         * Set through `style` rather than by editing the design system: `Footer`
         * spreads `...style` last over its own `background`, so this is the seam the
         * component already offers and the vendored bundle stays untouched.
         *
         * Three layers, painted front to back:
         *   1. a green-900 wash at 82%, which is what reduces the exposure
         *   2. the photograph, covering
         *   3. `--gradient-brand-deep`, the original background, still there if the
         *      image 404s so the footer degrades to exactly what it was before
         *
         * A wash rather than `filter: brightness()`. The hero could use a filter
         * because it sits on a `<video>` element with nothing inside it; a filter here
         * would apply to the whole `<footer>` and dim the links, headings and legal
         * line along with the picture — the opposite of legible.
         *
         * 82% is set by contrast, not taste. The footer carries white body text and
         * link labels at `--fs-body-sm`, and the photograph has bright regions; below
         * roughly 0.78 the small text starts failing AA against them.
         */
        style={{
          background:
            `linear-gradient(rgba(10, 44, 30, 0.82), rgba(10, 44, 30, 0.82)), ` +
            /*
             * `.webp`, and the reason is worth the line: the source is a 4032x3024 phone
             * photograph weighing 1.81MB, and it is a CSS background on the site shell, so
             * every page on the site downloaded it. Measured on the live site it took 27
             * seconds and was over half the page weight.
             *
             * Almost none of it is visible. The `linear-gradient` above lays 82% opaque
             * green over the whole thing, which is why 1600px at quality 58 is
             * indistinguishable from the original here and comes to 123KB. A 93% saving
             * on the single heaviest asset the site serves.
             */
            `url(${ASSETS}/footer-image.webp) center / cover no-repeat, ` +
            `var(--gradient-brand-deep)`,
        }}
      />
      <WhatsAppAction label={t("Chat on WhatsApp")} fixed />

      {toastMessage ? <div className="ct-toast">{toastMessage}</div> : null}
      {/* The "Translating this page" toast is gone with the sweep. Pages now arrive
          already translated, so there is no in-flight state to announce. */}
    </div>
  );
}
