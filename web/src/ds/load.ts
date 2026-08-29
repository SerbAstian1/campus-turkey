"use client";

/**
 * Loads the Campus Turkey design system.
 *
 * The bundle in `_ds/` is a classic script: an IIFE that reads a global `React` and
 * assigns its components to `window.CampusTurkeyDesignSystem_4d33e7`. It has no module
 * exports, so it is served from `public/ds/` and loaded with a script tag rather than
 * imported — a bundler cannot tree-shake or rewrite it, and trying only breaks it.
 *
 * `React` therefore has to be on `window` before the tag runs, and it must be the same
 * React the app imports. Two copies of React in one page is the classic cause of
 * "invalid hook call", so the app's own import is what gets published to the global
 * rather than a second copy from a CDN.
 *
 * The four patches at the bottom are the prototype's, reproduced from
 * `Campus Turkey Website.html`. Without them the site is subtly wrong: forms do not
 * validate, reveals miss route-mounted subtrees, hover states on buttons are dead and
 * eleven of the seventeen languages are missing.
 */

import React from "react";
import ReactDOM from "react-dom";
import { leadership, offices, portal, testimonials, universities } from "@/content";

export const DS_NAMESPACE = "CampusTurkeyDesignSystem_4d33e7";

declare global {
  interface Window {
    React?: typeof React;
    ReactDOM?: typeof ReactDOM;
    lucide?: { icons: Record<string, unknown>; createElement: (node: unknown) => SVGElement; createIcons: () => void };
    CampusTurkeyDesignSystem_4d33e7?: Record<string, unknown> & { __errors?: { path: string; error: string }[] };
    CT_DATA?: unknown;
    CT_TRANSLATE_ENDPOINT?: string;
    CT_I18N?: {
      readonly lang: string;
      readonly pending: number;
      languages: string[];
      set(code: string): void;
      subscribe(fn: (code: string) => void): () => void;
      t(key: string): string;
      sweep(): void;
      clearCache(code?: string): void;
    };
    T?: (key: string) => string;
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) { resolve(); return; }
    const el = document.createElement("script");
    el.src = src;
    el.async = false;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Could not load ${src}`));
    document.head.appendChild(el);
  });
}

let loading: Promise<void> | null = null;

/** Idempotent: repeated calls await the same load. */
export function loadDesignSystem(): Promise<void> {
  if (loading) return loading;

  loading = (async () => {
    window.React = React;
    window.ReactDOM = ReactDOM;

    /* The translator reads proper nouns out of CT_DATA to build its protected-terms
       list, and it does so on the first sweep — so this has to be in place before
       i18n.js runs, or university and people's names get machine-translated once. */
    window.CT_DATA = protectionData();

    /* Empty unless you configure it. See app/public/site/i18n.js for why the
       prototype's keyless endpoint is not used. */
    const endpoint = process.env["NEXT_PUBLIC_TRANSLATE_ENDPOINT"];
    if (endpoint) window.CT_TRANSLATE_ENDPOINT = endpoint;

    /*
     * Both requested at once, and still executed in order.
     *
     * Lucide has to *run* before the design system does: its `Icon` calls
     * `window.lucide.createElement` in an effect, and an icon that mounts before lucide
     * exists renders as an empty span. That ordering is preserved, but it never required
     * the two to be *fetched* one after the other, which is what awaiting the first did.
     *
     * The cost of the old shape was the whole of the second round trip. These are
     * roughly 80KB and 27KB gzipped, they gate the first paint of every page, and a good
     * part of this site's audience is on a phone in Lagos or Dhaka where a round trip is
     * not a rounding error. Appending both synchronously lets the browser open both
     * connections immediately.
     *
     * `el.async = false` in `loadScript` is what keeps execution ordered: a dynamically
     * inserted script with `async` explicitly false joins the in-order list, so the
     * browser may download them in either order and will still run them in insertion
     * order. `Promise.all` then waits for both rather than sequencing them.
     *
     * The `<link rel="preload">` pair in `app/[locale]/layout.tsx` starts these fetches
     * earlier still, with the document rather than after hydration. This function stays
     * correct without them.
     */
    const lucide = loadScript("/ds/lucide.min.js");
    const bundle = loadScript("/ds/_ds_bundle.js");
    await Promise.all([lucide, bundle]);
    /*
     * `/site/i18n.js` is no longer loaded.
     *
     * It carried the phrase book and the DOM sweep that machine-translated text nodes
     * after every render. Translation now happens on the server, per locale, before the
     * HTML is sent — so the sweep has nothing to do, and dropping it removes the
     * per-render cost of handoff note 7 and the unbounded cache of note 8 along with it.
     *
     * The file stays in public/ for now as the source of the reviewed phrases that were
     * already written for AR, FR, TR, RU and SW; `scripts/seed-messages.mjs` reads them
     * into the message catalogues rather than throwing that work away.
     */

    const ds = window[DS_NAMESPACE];
    if (!ds) throw new Error("The design system bundle loaded but exposed no components.");

    if (ds.__errors?.length) {
      console.error("Design system components failed to evaluate:", ds.__errors);
    }

    applyPatches(ds);
  })();

  return loading;
}

/* ----------------------------------------------------------------- protection */

/**
 * The subset of the content the translator needs in order to leave proper nouns alone.
 *
 * A directory that renames universities per language is unusable, because those names
 * appear on application portals and acceptance letters — and a translated company name
 * on a partner agreement is worse than a missing translation. This is the same set the
 * prototype protects, read out of the typed content rather than a global blob.
 */
function protectionData() {
  return {
    universities: universities.map((u) => ({ name: u.name, city: u.city })),
    offices: offices.map((o) => ({ city: o.city })),
    leadership: leadership.map((p) => ({ name: p.name })),
    testimonials: testimonials.map((t) => ({ name: t.name, country: t.country })),
    portal: {
      account: {
        org: portal.account.org,
        person: portal.account.person,
        manager: portal.account.manager,
        territory: portal.account.territory,
      },
      students: portal.students.map((s) => ({ name: s.name, university: s.university })),
    },
  };
}

/* -------------------------------------------------------------------- patches */

type AnyComponent = React.ComponentType<Record<string, unknown>>;

function applyPatches(ds: Record<string, unknown>) {
  patchRequiredForwarding(ds);
  patchScrollReveal(ds);
  patchButtonClass(ds);
  patchLanguages(ds);
}

/**
 * The design system's `Field` renders the required marker but never forwards `required`
 * — or any other validation attribute — to the control it labels, so no form on the
 * site validated. Mirror them onto the real control after mount.
 *
 * This is the prototype's own patch, kept because it is the fix rather than the bug.
 */
function patchRequiredForwarding(ds: Record<string, unknown>) {
  if ((ds as { __requiredPatched?: boolean }).__requiredPatched) return;

  const MIRROR = ["min", "max", "step", "minLength", "maxLength", "pattern", "inputMode", "autoComplete"] as const;
  const ATTR: Record<string, string> = {
    minLength: "minlength", maxLength: "maxlength", inputMode: "inputmode", autoComplete: "autocomplete",
  };

  for (const key of ["Input", "Select", "Checkbox"]) {
    const Base = ds[key] as AnyComponent | undefined;
    if (!Base) continue;

    const RequiredAware: React.FC<Record<string, unknown>> = (props) => {
      const id = props["id"] as string | undefined;
      const required = Boolean(props["required"]);

      React.useEffect(() => {
        if (!id) return;
        const el = document.getElementById(id) as HTMLInputElement | null;
        if (!el) return;
        el.required = required;
        if (required) el.setAttribute("aria-required", "true");
        else el.removeAttribute("aria-required");
        for (const prop of MIRROR) {
          const value = props[prop];
          if (value === undefined || value === null) continue;
          el.setAttribute(ATTR[prop] ?? prop, String(value));
        }
      });

      return React.createElement(Base, props);
    };

    RequiredAware.displayName = `RequiredAware(${key})`;
    ds[key] = RequiredAware;
  }

  (ds as { __requiredPatched?: boolean }).__requiredPatched = true;
}

/**
 * Route-safe reveal. The design system's observer can miss a subtree mounted by a route
 * switch — the element is already in the viewport when it mounts, so it never crosses
 * the threshold and stays at opacity 0 forever. Reveal immediately when it is already
 * on screen, and fall back to the observer otherwise.
 */
function patchScrollReveal(ds: Record<string, unknown>) {
  const ScrollReveal: React.FC<Record<string, unknown>> = (props) => {
    const delay = (props["delay"] as number) ?? 0;
    const distance = props["distance"] == null ? 16 : (props["distance"] as number);
    /* Read outside the effect: the effect must depend on the value, not on `props`,
       which changes identity on every render and would re-observe on each one. */
    const threshold = (props["threshold"] as number) ?? 0.12;
    const ref = React.useRef<HTMLElement>(null);
    const [shown, setShown] = React.useState(false);

    React.useEffect(() => {
      const el = ref.current;
      if (!el) return;

      let timer: number | null = null;
      let io: IntersectionObserver | null = null;
      let mounted = true;

      const reveal = () => {
        timer = window.setTimeout(() => { if (mounted) setShown(true); }, delay);
      };

      /* One tick late, so layout has settled and the rect is meaningful. */
      const start = window.setTimeout(() => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.98 && r.bottom > 0) { reveal(); return; }
        io = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              reveal();
              io?.disconnect();
            }
          },
          { threshold, rootMargin: "0px 0px -8% 0px" },
        );
        io.observe(el);
      }, 0);

      return () => {
        mounted = false;
        clearTimeout(start);
        if (timer) clearTimeout(timer);
        io?.disconnect();
      };
    }, [delay, threshold]);

    const style: React.CSSProperties = {
      opacity: shown ? 1 : 0,
      transform: shown ? "none" : `translateY(${distance}px)`,
      transition: "opacity 640ms cubic-bezier(.16,1,.3,1), transform 640ms cubic-bezier(.16,1,.3,1)",
      willChange: "opacity, transform",
      ...(props["style"] as React.CSSProperties | undefined),
    };

    return React.createElement(
      (props["as"] as string) || "div",
      { ref, className: props["className"], style },
      props["children"] as React.ReactNode,
    );
  };

  ScrollReveal.displayName = "ScrollReveal";
  ds["ScrollReveal"] = ScrollReveal;
}

/** Every button carries `.ct-btn`, which the stylesheet uses to rotate the disc -45deg. */
function patchButtonClass(ds: Record<string, unknown>) {
  const Base = ds["Button"] as AnyComponent | undefined;
  if (!Base) return;

  const Button: React.FC<Record<string, unknown>> = (props) =>
    React.createElement(Base, {
      ...props,
      className: `ct-btn${props["className"] ? ` ${props["className"] as string}` : ""}`,
    });

  Button.displayName = "Button";
  ds["Button"] = Button;
}

/**
 * The switcher defaults to the design system's own six-language array, and neither the
 * navbar nor the footer forwards a `languages` prop — so extending it in place is what
 * reaches every control at once.
 */
function patchLanguages(ds: Record<string, unknown>) {
  const languages = ds["LANGUAGES"] as { code: string; label: string; flag: string; dir: string }[] | undefined;
  if (!languages || languages.length !== 6) return;

  languages.push(
    { code: "ES", label: "Español", flag: "🇪🇸", dir: "ltr" },
    { code: "PT", label: "Português", flag: "🇧🇷", dir: "ltr" },
    { code: "FA", label: "فارسی", flag: "🇮🇷", dir: "rtl" },
    { code: "UR", label: "اردو", flag: "🇵🇰", dir: "rtl" },
    { code: "HI", label: "हिन्दी", flag: "🇮🇳", dir: "ltr" },
    { code: "BN", label: "বাংলা", flag: "🇧🇩", dir: "ltr" },
    { code: "ID", label: "Bahasa Indonesia", flag: "🇮🇩", dir: "ltr" },
    { code: "ZH", label: "中文", flag: "🇨🇳", dir: "ltr" },
    { code: "HA", label: "Hausa", flag: "🇳🇬", dir: "ltr" },
    { code: "YO", label: "Yorùbá", flag: "🇳🇬", dir: "ltr" },
    { code: "IG", label: "Igbo", flag: "🇳🇬", dir: "ltr" },
  );
}
