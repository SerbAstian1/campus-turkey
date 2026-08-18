/**
 * Asset URLs have to be absolute.
 *
 * `ASSETS` was the relative string `"assets"`, inherited from the `site/` prototype where
 * it is correct: that build is hash-routed, so the document never leaves the root and
 * `assets/logo-lockup-reversed.png` always resolves to `/assets/…`.
 *
 * This application is not hash-routed. Every page is `/[locale]/…`, and a relative URL
 * resolves against the current directory, so the one constant produced a different URL at
 * every route depth — `/assets/…` at `/en`, `/en/assets/…` at `/en/apply`, and
 * `/en/universities/assets/…` at `/en/universities/bilkent-university`. The brand artwork
 * was correct on the locale root and 404 everywhere else.
 *
 * It was never only the logo. `Logo`, `Navbar`, `CTABanner` and `Footer` all take this as
 * `assetBase`, and the footer photograph, the `PageHero` map wash and the hero video
 * interpolate it directly — so one relative string broke a different subset of images on
 * every page in the site.
 *
 * Nothing already in the suite could catch it. The markup is valid, the component
 * renders, the route returns 200 and the build is green; the image simply is not there.
 * The defect lives in the URL, so that is what these assert.
 *
 * **Not verifiable by fetching a page.** Every design system component comes from
 * `bind()`, which returns `null` when the bundle's `window` namespace is absent — as it
 * is on the server. So `Logo` contributes nothing to the server-rendered HTML, and the
 * `/assets/logo-lockup-reversed.png` a curl does find on every route is the hardcoded
 * loader in `app/providers.tsx`, which never used this constant and was never broken.
 * Reading the served markup therefore shows a correct URL whether or not the bug is
 * present. The last test here renders the real `Logo` out of the bundle instead, for the
 * reason `navbar-partner-login.test.tsx` gives: only the real component catches an
 * assumption about the real component.
 */

import React from "react";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { ASSETS } from "@/ds";
import dsBundleSource from "../../public/ds/_ds_bundle.js?raw";

const ROOT = join(__dirname, "..");

/** Every `.ts`/`.tsx` under `src/`, excluding tests. */
function sources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "test" || entry === "__tests__") continue;
      sources(full, out);
    } else if (/\.tsx?$/.test(entry) && !/\.(test|spec)\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Route depths that actually exist, shallowest to deepest. The bug was invisible at the
 * first of these and present at all the others, which is precisely why it shipped.
 */
const ROUTES = [
  "/en",
  "/en/apply",
  "/en/universities",
  "/en/universities/bilkent-university",
  "/en/study-in-turkiye/student-life",
  "/tr/study-in-turkiye/scholarships",
];

describe("the ASSETS base", () => {
  it("is absolute", () => {
    expect(ASSETS.startsWith("/")).toBe(true);
  });

  it("does not end in a slash, so `${ASSETS}/file` cannot double it", () => {
    expect(ASSETS.endsWith("/")).toBe(false);
    expect(`${ASSETS}/mark-reversed.png`).toBe("/assets/mark-reversed.png");
  });

  /** The property that was actually broken, asserted the way a browser resolves it. */
  it("resolves to the same path from every route depth", () => {
    const resolved = ROUTES.map(
      (route) => new URL(`${ASSETS}/logo-lockup-reversed.png`, `https://campusturkey.org${route}`).pathname,
    );

    expect(new Set(resolved).size).toBe(1);
    expect(resolved[0]).toBe("/assets/logo-lockup-reversed.png");
  });

  /**
   * The same check against the pre-fix value, so this test would have failed before the
   * change rather than merely describing it afterwards.
   */
  it("would have differed per depth had it stayed relative", () => {
    const resolved = ROUTES.map(
      (route) => new URL("assets/logo-lockup-reversed.png", `https://campusturkey.org${route}`).pathname,
    );

    expect(new Set(resolved).size).toBeGreaterThan(1);
  });
});

describe("the shipped source", () => {
  /**
   * Patterns specific enough that prose in a comment does not match them: each is a URL
   * being built from a relative asset literal, which is the defect reappearing somewhere
   * that does not go through the constant.
   */
  const RELATIVE = [
    /src=["'`]assets\//,
    /href=["'`]assets\//,
    /url\(assets\//,
    /assetBase=["'`]assets["'`]/,
    /assetBase=\{["'`]assets["'`]\}/,
  ];

  it("builds no asset URL from a relative literal", () => {
    const offenders: string[] = [];

    for (const file of sources(ROOT)) {
      const text = readFileSync(file, "utf8");
      for (const pattern of RELATIVE) {
        if (pattern.test(text)) {
          offenders.push(`${file.slice(ROOT.length + 1).split("\\").join("/")} — ${pattern}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});

/**
 * The real `Logo`, evaluated out of the shipped bundle exactly as
 * `navbar-partner-login.test.tsx` does it — a classic script that reads a global `React`
 * and hangs its exports on a `window` namespace.
 */
const DS_NAMESPACE = "CampusTurkeyDesignSystem_4d33e7";
type Components = Record<string, React.ComponentType<Record<string, unknown>>>;
let ds: Components;

beforeAll(() => {
  (globalThis as unknown as { React: typeof React }).React = React;
  (globalThis as unknown as { lucide: unknown }).lucide = {
    icons: {},
    createElement: () => document.createElementNS("http://www.w3.org/2000/svg", "svg"),
    createIcons: () => {},
  };

  // eslint-disable-next-line no-new-func
  new Function(dsBundleSource)();

  const loaded = (globalThis as Record<string, unknown>)[DS_NAMESPACE] as Components | undefined;
  if (!loaded) throw new Error("design system bundle exposed no components");
  ds = loaded;
});

describe("the design system Logo, rendered", () => {
  it("emits an absolute src when given the app's asset base", () => {
    const Logo = ds["Logo"]!;
    const { container } = render(
      React.createElement(Logo, { variant: "lockup", theme: "reversed", assetBase: ASSETS }),
    );

    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img!.getAttribute("src")).toBe("/assets/logo-lockup-reversed.png");

    cleanup();
  });

  /** The mark too — `BrandMark` is the one on the forms and the contact page. */
  it("emits an absolute src for the mark", () => {
    const Logo = ds["Logo"]!;
    const { container } = render(
      React.createElement(Logo, { variant: "mark", theme: "reversed", assetBase: ASSETS }),
    );

    expect(container.querySelector("img")!.getAttribute("src")).toBe("/assets/mark-reversed.png");

    cleanup();
  });
});
