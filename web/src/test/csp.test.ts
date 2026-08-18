/**
 * The Content-Security-Policy, in both environments it has to be correct in.
 *
 * **A CSP is uniquely bad at announcing its own mistakes.** The response is a 200 with
 * valid markup; the browser silently declines to run something, and what the reader sees
 * is a blank or half-built page. That is exactly how this went wrong: `script-src` had no
 * `'unsafe-eval'`, Next's development build evaluates every module through `eval()`, and
 * so the client bundle never executed. The design system never reached `window`, every
 * `bind()` returned `null`, and the app sat on its loading screen. It presented as "the
 * directory page will not load and the images are missing" — and the whole suite stayed
 * green, because nothing here had ever asserted a header.
 *
 * The two directions are not symmetrical, which is why both are tested. Missing
 * `'unsafe-eval'` in development costs an afternoon. Present in production it hands
 * anyone who gets a string into the page the ability to execute it, which is most of what
 * a CSP exists to prevent.
 */

import { describe, expect, it } from "vitest";
import { contentSecurityPolicy } from "../../middleware";

const TILES = ["https://api.maptiler.com"];

/** One directive, by name, from a policy string. */
const directive = (policy: string, name: string): string =>
  policy.split(";").map((d) => d.trim()).find((d) => d.startsWith(`${name} `)) ?? "";

describe("the content security policy", () => {
  it("allows eval outside production, so the dev bundle can execute", () => {
    expect(directive(contentSecurityPolicy(TILES, false), "script-src")).toContain("'unsafe-eval'");
  });

  it("never allows eval in production", () => {
    expect(directive(contentSecurityPolicy(TILES, true), "script-src")).not.toContain("'unsafe-eval'");
  });

  it("keeps the captcha script hosts in both environments", () => {
    for (const isProduction of [true, false]) {
      const script = directive(contentSecurityPolicy(TILES, isProduction), "script-src");
      expect(script).toContain("https://js.hcaptcha.com");
      expect(script).toContain("'self'");
    }
  });

  it("does not leak eval into any other directive", () => {
    // `'unsafe-eval'` is only meaningful on script-src; anywhere else it is a mistake
    // that would read as deliberate to the next person.
    const policy = contentSecurityPolicy(TILES, false);
    const offenders = policy.split(";").map((d) => d.trim())
      .filter((d) => d.includes("'unsafe-eval'") && !d.startsWith("script-src "));
    expect(offenders).toEqual([]);
  });

  it("still names the tile hosts it was given", () => {
    expect(contentSecurityPolicy(TILES, true)).toContain("https://api.maptiler.com");
  });
});
