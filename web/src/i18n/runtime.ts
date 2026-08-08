"use client";

/**
 * React bridge onto the translation runtime in `public/site/i18n.js`.
 *
 * The runtime is the prototype's, loaded as a classic script. It owns the phrase book,
 * the protected-term masking, the RTL direction and the DOM sweep; this file is only
 * the part React needs — a subscription and a typed `T`.
 */

import { useEffect, useState } from "react";

/** Keyed lookup. Mirrors the prototype's global `T`. */
export function T(key: string): string {
  return window.CT_I18N?.t(key) ?? key;
}

export function setLanguage(code: string): void {
  window.CT_I18N?.set(code);
}

export function currentLanguage(): string {
  return window.CT_I18N?.lang ?? "EN";
}

/**
 * The active language, kept in step with the runtime.
 *
 * The portal sidebar carries its own switcher, so both follow the same source of truth
 * rather than each holding a copy that can drift.
 */
export function useLanguage(): [string, (code: string) => void] {
  const [lang, setLang] = useState<string>(currentLanguage);
  useEffect(() => window.CT_I18N?.subscribe(setLang), []);
  return [lang, setLanguage];
}

/**
 * Re-applies the phrase sweep after every render, because React replaces text nodes
 * wholesale and a swept node reverts to English the moment its parent re-renders.
 *
 * Also watches the tree: menus, sheets and cards mount after the render pass, so a
 * sweep tied only to render misses them.
 */
export function useTranslationSweep(lang: string): void {
  useEffect(() => {
    window.CT_I18N?.sweep();
  });

  useEffect(() => {
    /**
     * `document.body`, not `#root`.
     *
     * The Vite build mounted into `<div id="root">` from index.html. Next renders
     * straight into `<body>`, so after the migration this lookup returned null and the
     * observer was never attached — the sweep then only ran on the render effect above
     * and missed every menu, sheet and card that mounts afterwards. A silent
     * regression: the language switcher still changed the label, so it looked fine.
     */
    const root = document.body;
    if (!root || lang === "EN") return;

    let queued = false;
    const observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(() => {
        queued = false;
        window.CT_I18N?.sweep();
      });
    });

    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [lang]);
}

/** True while machine translations are in flight, so the page can say so. */
export function useTranslating(lang: string): boolean {
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    if (lang === "EN") { setTranslating(false); return; }
    const id = window.setInterval(() => {
      setTranslating((window.CT_I18N?.pending ?? 0) > 0);
    }, 300);
    return () => window.clearInterval(id);
  }, [lang]);

  return translating;
}
