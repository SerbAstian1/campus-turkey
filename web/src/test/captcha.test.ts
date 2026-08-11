/**
 * The captcha wiring, and the CSP that has to permit it.
 *
 * The server has verified tokens since the leads endpoint was written; nothing produced
 * one. `submit.ts` looked for a Turnstile global that no code rendered and fell back to
 * a placeholder string, so with a provider configured every submission on all four
 * public forms would have been refused with a 403 — the entire lead funnel, closed, with
 * the forms looking normal and the build green.
 *
 * These tests cover the two halves that failure had: the token, and the policy that lets
 * the widget load at all. A CSP missing one of hCaptcha's four directives produces the
 * identical symptom, which is why the hosts are asserted rather than trusted.
 */

import { describe, expect, it } from "vitest";
import {
  HCAPTCHA_CONNECT_HOSTS,
  HCAPTCHA_FRAME_HOSTS,
  HCAPTCHA_SCRIPT_HOSTS,
  HCAPTCHA_STYLE_HOSTS,
} from "@/features/leads/captcha-hosts";

/** Every origin hCaptcha is permitted to use, across all four directives. */
const allHosts = [
  ...HCAPTCHA_SCRIPT_HOSTS,
  ...HCAPTCHA_FRAME_HOSTS,
  ...HCAPTCHA_CONNECT_HOSTS,
  ...HCAPTCHA_STYLE_HOSTS,
];

describe("the hCaptcha CSP origins", () => {
  /**
   * The script the widget is loaded from. `captcha.tsx` builds its `<script src>` from
   * this origin; if the two disagree the script is blocked and nothing renders.
   */
  it("allows the script origin the widget actually loads", () => {
    expect(HCAPTCHA_SCRIPT_HOSTS).toContain("https://js.hcaptcha.com");
  });

  it("allows the iframe origin the challenge renders into", () => {
    expect(HCAPTCHA_FRAME_HOSTS).toContain("https://newassets.hcaptcha.com");
  });

  it("allows the API origin the widget calls while solving", () => {
    expect(HCAPTCHA_CONNECT_HOSTS).toContain("https://api.hcaptcha.com");
  });

  it("allows the stylesheet origin, which is not the script origin", () => {
    // Easy to miss: the assets host serves the styles, and a widget with no styles is
    // an invisible one that still has to be solved.
    expect(HCAPTCHA_STYLE_HOSTS).toContain("https://newassets.hcaptcha.com");
  });

  it("names only hCaptcha origins, over https", () => {
    for (const host of allHosts) {
      expect(host).toMatch(/^https:\/\/[a-z]+\.hcaptcha\.com$/);
    }
  });

  /** A trailing slash or a path makes a CSP source expression match differently. */
  it("carries bare origins, with no path or trailing slash", () => {
    for (const host of allHosts) {
      expect(new URL(host).origin).toBe(host);
    }
  });
});

describe("the token, with no site key configured", () => {
  /**
   * The unit environment sets no `NEXT_PUBLIC_HCAPTCHA_SITE_KEY`, which is the
   * development case: no widget renders and the server has the provider disabled, so a
   * placeholder is both accepted and correct.
   *
   * The production case is guarded elsewhere and deliberately not simulated here —
   * `config.ts` refuses to boot when `CAPTCHA_PROVIDER=hcaptcha` without a site key, so
   * the combination this placeholder would be wrong for cannot start.
   */
  it("returns the development placeholder rather than an empty string", async () => {
    const { captchaToken } = await import("@/features/leads/captcha");

    expect(await captchaToken()).toBe("development-placeholder-token");
  });

  it("resetting is a no-op rather than a crash when no widget exists", async () => {
    const { resetCaptcha } = await import("@/features/leads/captcha");

    // Called after every submission, including in development where nothing rendered.
    expect(() => resetCaptcha()).not.toThrow();
  });
});
