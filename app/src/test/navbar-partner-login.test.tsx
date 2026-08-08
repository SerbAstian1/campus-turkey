/**
 * End-to-end proof that the navbar's Partner Login button reaches the portal.
 *
 * This test renders the *real* design system Navbar out of `_ds_bundle.js` and clicks
 * the actual rendered anchor, rather than a fixture shaped like one.
 *
 * That distinction is the whole point. The first attempt at this fix passed a
 * `secondaryHref` prop to `Navbar`. `Navbar` accepts no such prop — it hardcodes
 * `href="#consultation"` — so the change typechecked, built, shipped, and did nothing.
 * A test against a hand-written fixture would have passed too. Only rendering the real
 * component catches an assumption about the real component.
 */

import React from "react";
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { usePlaceholderLinks } from "@/app/router";

/**
 * The bundle's source text, inlined by Vite at build time.
 *
 * `?raw` rather than reading the file at runtime: it needs no node types (the app's
 * tsconfig deliberately has none), it resolves relative to this file rather than to the
 * working directory, and a missing bundle becomes a build error naming the path instead
 * of a runtime failure inside `beforeAll`.
 */
import dsBundleSource from "../../public/ds/_ds_bundle.js?raw";

const DS_NAMESPACE = "CampusTurkeyDesignSystem_4d33e7";

type Components = Record<string, React.ComponentType<Record<string, unknown>>>;
let ds: Components;

beforeAll(() => {
  // The bundle is a classic script reading a global `React` and assigning its exports
  // to a namespace on `window`. Loading it the way the app does — a <script> tag —
  // does not work in jsdom, so it is evaluated directly.
  (globalThis as unknown as { React: typeof React }).React = React;

  // The design system's Icon calls into lucide inside an effect. A missing global
  // throws during render; an empty stub renders nothing, which is all this test needs.
  (globalThis as unknown as { lucide: unknown }).lucide = {
    icons: {},
    createElement: () => document.createElementNS("http://www.w3.org/2000/svg", "svg"),
    createIcons: () => {},
  };

  // eslint-disable-next-line no-new-func
  new Function(dsBundleSource)();

  const loaded = (globalThis as Record<string, unknown>)[DS_NAMESPACE] as
    | (Components & { __errors?: { path: string; error: string }[] })
    | undefined;

  if (!loaded) throw new Error("design system bundle exposed no components");
  ds = loaded;
});

/** The shell, reduced to the two things that decide where this button goes. */
function Shell() {
  usePlaceholderLinks();
  const Navbar = ds["Navbar"]!;
  return (
    <div className="ct-desktop-nav">
      <Navbar
        items={[{ label: "Study in Türkiye", href: "#/study" }]}
        ctaLabel="Apply Now"
        ctaHref="#/apply"
        secondaryLabel="Partner Login"
      />
    </div>
  );
}

afterEach(() => {
  window.location.hash = "";
});

describe("the real Navbar", () => {
  it("renders the secondary button with the design system's hardcoded placeholder", () => {
    // Documents the constraint this fix works around. If a future version of the
    // design system gives the button a real href or a prop, this assertion fails and
    // the workaround in router.ts can be deleted.
    render(<Shell />);
    const button = screen.getByText("Partner Login").closest("a");
    expect(button).not.toBeNull();
    expect(button!.getAttribute("href")).toBe("#consultation");
  });

  it("navigates to the portal when Partner Login is clicked", () => {
    // The bug, asserted against the real rendered button.
    render(<Shell />);
    fireEvent.click(screen.getByText("Partner Login"));
    expect(window.location.hash).toBe("#/portal");
  });

  it("does not navigate to the contact page", () => {
    render(<Shell />);
    fireEvent.click(screen.getByText("Partner Login"));
    expect(window.location.hash).not.toBe("#/contact");
  });

  it("does not intercept the primary call to action", () => {
    // Guards the scoping from the other side: the fix must not capture every anchor in
    // the navbar. `#/apply` is a real href, so the handler must leave the click alone
    // and let the browser follow it.
    //
    // Asserted on `defaultPrevented` rather than on the resulting hash, because jsdom
    // does not navigate on an anchor click — asserting the hash here would be testing
    // jsdom, not this code.
    render(<Shell />);
    const anchor = screen.getByText("Apply Now").closest("a");
    expect(anchor?.getAttribute("href")).toBe("#/apply");

    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    anchor!.dispatchEvent(click);

    expect(click.defaultPrevented).toBe(false);
    expect(window.location.hash).not.toBe("#/portal");
  });

  it("does prevent the default on the placeholder it rewrites", () => {
    // The mirror of the above. Following `#consultation` natively would leave the URL
    // on a hash the router does not recognise, so this click must be claimed.
    render(<Shell />);
    const anchor = screen.getByText("Partner Login").closest("a");

    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    anchor!.dispatchEvent(click);

    expect(click.defaultPrevented).toBe(true);
    expect(window.location.hash).toBe("#/portal");
  });
});
