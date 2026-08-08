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
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { render, fireEvent, screen, cleanup } from "@testing-library/react";

/**
 * `usePlaceholderLinks` now pushes through the Next.js router, which only exists inside
 * an App Router render. Stubbing it is the point of the test rather than a compromise:
 * what is being asserted is *which path the click resolves to*, and a spy records that
 * more directly than a real navigation would.
 */
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/",
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

const { usePlaceholderLinks } = await import("@/app/router");

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
  // Explicit, because testing-library only registers its own auto-cleanup when Vitest
  // runs with `globals: true` — and this config does not. Without it each render stacks
  // another navbar into the document and `getByText` finds two of everything.
  cleanup();
  push.mockClear();
});

describe("the real Navbar", () => {
  it("renders the secondary button with the design system's hardcoded placeholder", () => {
    // Documents the constraint this works around. If a future version of the design
    // system gives the button a real href or a prop, this assertion fails and the
    // workaround in router.ts can be deleted.
    render(<Shell />);
    const button = screen.getByText("Partner Login").closest("a");
    expect(button).not.toBeNull();
    expect(button!.getAttribute("href")).toBe("#consultation");
  });

  it("navigates to /portal when Partner Login is clicked", () => {
    // The bug, asserted against the real rendered button and the real path.
    render(<Shell />);
    fireEvent.click(screen.getByText("Partner Login"));
    expect(push).toHaveBeenCalledWith("/portal");
  });

  it("does not navigate to the contact page", () => {
    render(<Shell />);
    fireEvent.click(screen.getByText("Partner Login"));
    expect(push).not.toHaveBeenCalledWith("/contact");
  });

  it("routes the primary call to action to /apply as a client transition", () => {
    // The other half of the scoping. `#/apply` is a real destination, so it must not be
    // treated as a placeholder — but it should still be upgraded from the design
    // system's leftover hash href into a router push rather than a document load.
    render(<Shell />);
    const anchor = screen.getByText("Apply Now").closest("a");
    expect(anchor?.getAttribute("href")).toBe("#/apply");

    fireEvent.click(anchor!);
    expect(push).toHaveBeenCalledWith("/apply");
  });

  it("claims the click rather than letting the browser follow the placeholder", () => {
    // Following `#consultation` natively would leave the URL on a hash no route
    // matches, so this click must be prevented.
    render(<Shell />);
    const anchor = screen.getByText("Partner Login").closest("a");

    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    anchor!.dispatchEvent(click);

    expect(click.defaultPrevented).toBe(true);
  });

  it("leaves a modified click to the browser, so cmd-click still opens a tab", () => {
    // The classic client-router regression: intercepting every click breaks
    // middle-click and cmd-click.
    render(<Shell />);
    const anchor = screen.getByText("Partner Login").closest("a");

    const click = new MouseEvent("click", { bubbles: true, cancelable: true, metaKey: true });
    anchor!.dispatchEvent(click);

    expect(click.defaultPrevented).toBe(false);
    expect(push).not.toHaveBeenCalled();
  });
});
