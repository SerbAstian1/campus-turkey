"use client";

/**
 * The design system boundary.
 *
 * `_ds_bundle.js` is a classic script, not a module: it reads a global `React` and
 * assigns its components onto `window`. A bundler cannot import it, tree-shake it or
 * rewrite it, and the server cannot execute it at all — there is no `window` there.
 *
 * So every screen in this application is a client component, and none of them may
 * render until the bundle has resolved. This provider is where that is enforced. It
 * loads the bundle once, holds back its children until the global namespace exists,
 * and shows the boot screen in the meantime — the same window `index.html` covered in
 * the Vite build.
 *
 * What this costs, stated plainly: page *bodies* are client-rendered. What it does not
 * cost is the SEO work that motivated the migration — `<title>`, meta description,
 * canonical, Open Graph, JSON-LD, the sitemap and a real 404 status are all emitted by
 * the server from `generateMetadata`, and none of them depend on this bundle. Handoff
 * note 6 is satisfied either way.
 *
 * Removing this provider means replacing the UMD bundle with real ES modules, which is
 * EDSAI Dept 7's call and a separate piece of work.
 */

import { useEffect, useState } from "react";
import { loadDesignSystem } from "@/ds/load";
import { useT } from "@/i18n/context";

type Status = "loading" | "ready" | "failed";

/**
 * The boot screen, transcribed from the Vite build's `index.html`.
 *
 * Inline styles rather than a class: this renders before the design system's tokens
 * are guaranteed to have been applied, so it cannot depend on them.
 */
function BootScreen() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0A2C1E",
      }}
    >
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
        Loading Campus Turkey
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/logo-lockup-reversed.png"
        alt=""
        width={220}
        height={97}
        style={{ height: 104, width: "auto", opacity: 0.92 }}
      />
    </div>
  );
}

/**
 * Shown when the bundle cannot be fetched at all.
 *
 * Deliberately not the designed error screen: that screen is built from design system
 * components, and the design system is the thing that just failed. An error state that
 * depends on the failure is not an error state.
 */
function BootFailure() {
  /*
   * Safe to translate even here. This screen exists because the design system bundle
   * failed, and `useT` depends on `LocaleProvider` — React context set by the layout —
   * not on that bundle. The styles below stay inline for the reason the comment above
   * gives; the words do not have to stay English for it.
   */
  const t = useT();

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        textAlign: "center",
        color: "#0A2C1E",
        lineHeight: 1.6,
      }}
    >
      <div>
        <h1 style={{ margin: "0 0 8px" }}>{t("This page did not load")}</h1>
        <p style={{ margin: 0, opacity: 0.8 }}>
          {t("Something went wrong on our side. Reloading usually fixes it.")}
        </p>
      </div>
    </div>
  );
}

export function DesignSystemProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let mounted = true;

    loadDesignSystem()
      .then(() => mounted && setStatus("ready"))
      .catch((error: unknown) => {
        // Reported, not swallowed. Without this the failure is a blank green screen
        // and nothing in the logs explains it.
        console.error("Design system failed to load:", error);
        if (mounted) setStatus("failed");
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (status === "loading") return <BootScreen />;
  if (status === "failed") return <BootFailure />;
  return <>{children}</>;
}
