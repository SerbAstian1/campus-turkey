/**
 * The application shell. Transcribed from `Campus Turkey Website.html`.
 *
 * Chrome (navbar, footer, WhatsApp bubble) is present on every route except the portal,
 * which is an application with its own navigation. The page is re-keyed on the route so
 * the `.ct-page` transform animation replays on each navigation.
 */

import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from "react";
import { Footer, Navbar, ScrollProgress, ASSETS } from "@/ds";
import { footerColumns, contact, socials, nav } from "@/content";
import { T, useLanguage, useTranslating, useTranslationSweep } from "@/i18n/runtime";
import { WhatsAppAction } from "@/components/Common";

import { ErrorScreen, OfflineGuard, ERROR_STATES, type ErrorState } from "@/screens/Errors";
import { MobileNav } from "./MobileNav";
import { MEGA } from "./mega";
import { routeKey, useRoute, usePlaceholderLinks, go } from "./router";
import { subscribeToToasts } from "./toast";
import { renderScreen } from "./screens";

/** A failing screen degrades to a recoverable panel instead of blanking the page. */
class RouteBoundary extends Component<
  { routeKey: string; children: ReactNode },
  { failed: boolean; detail: string | null }
> {
  constructor(props: { routeKey: string; children: ReactNode }) {
    super(props);
    this.state = { failed: false, detail: null };
  }

  static getDerivedStateFromError(error: unknown) {
    return { failed: true, detail: error instanceof Error ? error.message : null };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
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

export function App() {
  const route = useRoute();
  const [lang, setLanguage] = useLanguage();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [narrow, setNarrow] = useState(() => window.innerWidth < 1180);

  usePlaceholderLinks();
  useTranslationSweep(lang);
  const translating = useTranslating(lang);

  useEffect(() => subscribeToToasts(setToastMessage), []);

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 1180);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* The design system's Icon draws through lucide on mount; re-running the sweep after
     each render catches icons in subtrees that mounted this pass. */
  useEffect(() => { window.lucide?.createIcons(); });

  const { name, param } = route;
  const key = routeKey(route);
  const chrome = name !== "portal";

  const navLabels: Record<string, string> = {
    study: T("nav.study"),
    universities: T("nav.universities"),
    Services: T("nav.services"),
    Partners: T("nav.partners"),
    about: T("nav.about"),
  };

  const navItems = nav.map((n) => ({
    label: n.route ? (navLabels[n.route] ?? n.label) : (navLabels[n.label] ?? n.label),
    href: n.route ? `#/${n.route}` : undefined,
    children: n.mega ? MEGA[n.mega] : undefined,
    _route: n.route,
  }));

  const footerTitles: Record<string, string> = {
    Education: T("footer.education"),
    Services: T("footer.services"),
    Partners: T("footer.partners"),
    Company: T("footer.company"),
  };

  return (
    <div>
      <a className="ct-skip" href="#main">Skip to content</a>
      <ScrollProgress />

      {chrome ? (
        <>
          <MobileNav lang={lang} onLangChange={setLanguage} route={key} />
          <div className="ct-desktop-nav">
            <Navbar
              items={navItems}
              activeItem={ACTIVE[name]}
              lang={lang}
              onLangChange={setLanguage}
              assetBase={ASSETS}
              ctaLabel={T("cta.apply")}
              ctaHref="#/apply"
              /* The design system hardcodes this button's destination to
                 `href="#consultation"` and exposes no prop to change it — only the
                 label. Relabelling it "Partner Login" therefore leaves it pointing at
                 the contact page, and the correction is made by `usePlaceholderLinks`
                 in ./router, which resolves that placeholder to the portal when the
                 click came from inside the navbar. */
              secondaryLabel={narrow ? "" : "Partner Login"}
              onSelect={(item, e) => {
                /* A group trigger has no destination. Without this it falls through to
                   the design system's placeholder href and navigates away, which is the
                   only way into the menu on a touch device. */
                if (item.children && !item.href) { e?.preventDefault(); return; }
                if (item.href) { e?.preventDefault(); go(item.href.replace(/^#\//, "")); }
              }}
            />
          </div>
        </>
      ) : null}

      <main id="main" className="ct-page" key={key}>
        <OfflineGuard>
          <RouteBoundary routeKey={key}>
            {renderScreen(name, param)}
          </RouteBoundary>
        </OfflineGuard>
      </main>

      {chrome ? (
        <>
          <Footer
            columns={footerColumns.map((c) => ({
              title: footerTitles[c.title] ?? c.title,
              links: c.links.map((l) => ({ label: l.label, href: `#/${l.route}` })),
            }))}
            contact={contact}
            socials={socials}
            lang={lang}
            onLangChange={setLanguage}
            assetBase={ASSETS}
            legal="© 2026 Campus Turkey. Your guide to study in Turkey."
          />
          <WhatsAppAction label={T("cta.whatsapp")} fixed />
        </>
      ) : null}

      {toastMessage ? <div className="ct-toast">{toastMessage}</div> : null}
      {translating ? <div className="ct-toast ct-translating"><i />Translating this page</div> : null}
    </div>
  );
}

export { ERROR_STATES };
export type { ErrorState };
