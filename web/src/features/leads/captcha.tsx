"use client";

/**
 * hCaptcha, on the four public lead forms.
 *
 * The server has verified captcha tokens since the leads endpoint was written — it posts
 * to hCaptcha's `siteverify` and refuses the submission when the answer is not `success`.
 * What never existed was the half that produces a token. `submit.ts` looked for a
 * *Turnstile* global that nothing rendered and fell back to the literal string
 * `"development-placeholder-token"`, which is fine in development, where the provider is
 * `disabled` and the server accepts anything, and fatal in production, where hCaptcha
 * rejects it and every submission on Apply, Contact, Partner and Representative returns
 * 403. The whole lead funnel, refused, with the forms looking entirely normal.
 *
 * Presence of `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` is what decides whether a widget appears.
 * That mirrors `features/map/tiles.ts` and the rest of this codebase: local development
 * runs with no external accounts, and production is stopped from inheriting the
 * relaxation by the boot check in `server/lib/config.ts` rather than by hoping.
 */

import { useEffect, useRef, useState } from "react";

interface HCaptcha {
  render: (container: HTMLElement, options: { sitekey: string; theme?: string }) => string;
  getResponse: (widgetId: string) => string;
  reset: (widgetId: string) => void;
}

declare global {
  interface Window {
    hcaptcha?: HCaptcha;
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;
const SCRIPT_SRC = "https://js.hcaptcha.com/1/api.js?render=explicit";

/**
 * The id of the widget currently on the page.
 *
 * Module-level for the same reason the navigation bridge is: `captchaToken()` is called
 * from `useLeadSubmit`, which has no view of the component tree, and threading a ref
 * through three forms to reach it would be a larger change than the value it adds. Only
 * one lead form is ever mounted at a time — they are separate routes.
 */
let activeWidget: string | null = null;

let loading: Promise<void> | null = null;

/** Load the hCaptcha script once, however many times a form mounts. */
function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.hcaptcha) return Promise.resolve();

  loading ??= new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("hCaptcha failed to load")));
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("hCaptcha failed to load"));
    document.head.appendChild(script);
  });

  return loading;
}

/**
 * The token for the current challenge, or the development placeholder.
 *
 * Returns `""` rather than a placeholder when a widget exists but has not been solved —
 * the server refuses an empty token, which is the correct outcome and produces the
 * form's ordinary error message rather than a silent failure.
 */
export async function captchaToken(): Promise<string> {
  if (!SITE_KEY) {
    // No site key: development. The server has the provider disabled and accepts this.
    return "development-placeholder-token";
  }

  if (typeof window === "undefined" || !window.hcaptcha || activeWidget === null) return "";
  return window.hcaptcha.getResponse(activeWidget) || "";
}

/**
 * Clear the challenge after a submission.
 *
 * hCaptcha tokens are single-use. Without this a visitor who hits a validation error and
 * corrects it submits the spent token the second time and is refused for a reason the
 * form cannot explain — the classic "it worked once and now it won't" captcha bug.
 */
export function resetCaptcha(): void {
  if (typeof window === "undefined" || !window.hcaptcha || activeWidget === null) return;
  window.hcaptcha.reset(activeWidget);
}

/**
 * The widget itself. Render inside a form, above its submit button.
 *
 * Renders nothing at all without a site key, so the development forms are unchanged and
 * no empty box appears where a challenge would be.
 */
export function CaptchaField() {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!SITE_KEY || !host.current) return;

    let cancelled = false;

    void loadScript()
      .then(() => {
        // The effect can outlive the mount under StrictMode's double-invoke, and
        // rendering into a detached node throws inside hCaptcha rather than here.
        if (cancelled || !host.current || !window.hcaptcha) return;
        if (host.current.childElementCount > 0) return;

        activeWidget = window.hcaptcha.render(host.current, { sitekey: SITE_KEY });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      activeWidget = null;
    };
  }, []);

  if (!SITE_KEY) return null;

  return (
    <div>
      <div ref={host} />
      {/*
        A blocked or failed script leaves an empty space and a submit button that will be
        refused by the server with a message about verification the visitor cannot act
        on. Saying so is better than letting them guess — and this is also what a CSP
        misconfiguration looks like from the outside.
      */}
      {failed ? (
        <span
          role="alert"
          style={{
            display: "block",
            marginTop: "var(--space-2)",
            fontFamily: "var(--font-ui)",
            fontSize: "var(--fs-body-sm)",
            color: "var(--status-danger)",
          }}
        >
          The verification challenge could not load. Please disable any content blocker
          for this page, or contact us on WhatsApp instead.
        </span>
      ) : null}
    </div>
  );
}
