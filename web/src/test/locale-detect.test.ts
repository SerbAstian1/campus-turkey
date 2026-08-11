/**
 * First-visit locale detection, and the rule that keeps it honest.
 *
 * The precedence is the whole feature: an explicit choice must always beat a guess about
 * the browser. Get it the wrong way round and a visitor who deliberately switched to
 * English on a Turkish laptop is handed Turkish again on their next visit, which reads
 * as the site ignoring them rather than as a subtle ordering bug.
 *
 * The URL is not represented here because it never reaches this code — the middleware
 * only consults detection when the path carries no locale at all.
 */

import { describe, expect, it } from "vitest";
import { detectLocale, localeFromCookie, matchAcceptLanguage } from "@/i18n/detect";
import { DEFAULT_LOCALE } from "@/i18n/locales";

describe("matchAcceptLanguage", () => {
  it("takes an exact supported tag", () => {
    expect(matchAcceptLanguage("tr")).toBe("tr");
  });

  /** `pt-BR` must reach Portuguese; there are no region catalogues to fall through to. */
  it("collapses a region subtag to the base language", () => {
    expect(matchAcceptLanguage("pt-BR")).toBe("pt");
    expect(matchAcceptLanguage("fr-CA,fr;q=0.9")).toBe("fr");
  });

  it("collapses a script subtag, which is how Chinese arrives", () => {
    expect(matchAcceptLanguage("zh-Hans-CN")).toBe("zh");
  });

  it("honours quality ordering rather than header order", () => {
    // Unsupported first at a lower weight; the supported one should still win.
    expect(matchAcceptLanguage("da;q=0.3,ar;q=0.9")).toBe("ar");
  });

  it("skips unsupported languages instead of guessing", () => {
    expect(matchAcceptLanguage("da,no,is")).toBeNull();
  });

  it("ignores the wildcard, which expresses no preference", () => {
    expect(matchAcceptLanguage("*")).toBeNull();
  });

  it("returns null for an absent or empty header", () => {
    expect(matchAcceptLanguage(null)).toBeNull();
    expect(matchAcceptLanguage("")).toBeNull();
  });

  it("survives a malformed q value rather than throwing", () => {
    expect(matchAcceptLanguage("ar;q=banana")).toBeNull();
    expect(matchAcceptLanguage("ar;q=,fr")).toBe("fr");
  });
});

describe("localeFromCookie", () => {
  it("accepts a supported locale", () => {
    expect(localeFromCookie("ur")).toBe("ur");
    expect(localeFromCookie(" AR ")).toBe("ar");
  });

  /**
   * A locale that was removed from the registry must not keep being served from an old
   * cookie. Rejecting it here is what makes removing a locale safe.
   */
  it("rejects a value that is no longer a supported locale", () => {
    expect(localeFromCookie("kl")).toBeNull();
    expect(localeFromCookie("../../etc/passwd")).toBeNull();
    expect(localeFromCookie("")).toBeNull();
  });
});

describe("precedence", () => {
  it("prefers the cookie over the browser header", () => {
    const result = detectLocale({ cookie: "en", acceptLanguage: "tr,tr-TR;q=0.9" });

    // The case the ordering exists for: an explicit English choice on a Turkish browser.
    expect(result).toEqual({ locale: "en", source: "cookie" });
  });

  it("uses the header when no choice has been made", () => {
    expect(detectLocale({ acceptLanguage: "ha" })).toEqual({ locale: "ha", source: "header" });
  });

  it("falls back to English when nothing matches", () => {
    expect(detectLocale({ acceptLanguage: "da,no" })).toEqual({
      locale: DEFAULT_LOCALE,
      source: "default",
    });
  });

  it("falls back to English with no signal at all", () => {
    expect(detectLocale({})).toEqual({ locale: DEFAULT_LOCALE, source: "default" });
  });

  /**
   * `source` is not decoration — the middleware redirects only when it is not
   * `"default"`. A crawler sends no cookie and no `Accept-Language`, lands on
   * `"default"`, and is served English at the unprefixed URL exactly as before, which
   * is what keeps the redirect from touching the indexed addresses.
   */
  it("reports the source, so the caller can decide whether to redirect", () => {
    expect(detectLocale({ cookie: "fr" }).source).toBe("cookie");
    expect(detectLocale({ acceptLanguage: "fr" }).source).toBe("header");
    expect(detectLocale({}).source).toBe("default");
  });

  it("ignores a corrupt cookie and falls through to the header", () => {
    expect(detectLocale({ cookie: "nonsense", acceptLanguage: "es" })).toEqual({
      locale: "es",
      source: "header",
    });
  });
});
