/**
 * A design system component whose parent never re-renders must still appear when the
 * bundle lands.
 *
 * **This is a regression test for a bug that reached the deployed site.** The design
 * system is a script tag that assigns components to a global, so `bind()` resolves its
 * implementation at render time and returns `null` until the global exists. That was
 * safe only because `DesignSystemProvider` withheld every child until the bundle had
 * loaded: a bound component's first render was always its successful one.
 *
 * Removing that gate, so pages could be server-rendered for search engines, removed the
 * guarantee with it. A component mounted before the bundle arrived had no reason of its
 * own to render again, so it stayed `null` for ever.
 *
 * The shape of the failure is what made it slip through. Anything inside a `Hydrated`
 * boundary was fine, because that boundary consumes the load status and re-renders its
 * subtree after the flip. Anything *outside* one was not, and the navbar and footer live
 * in `Shell`, which is outside. The deployed site had a complete, styled, correct page
 * body with no navigation and no footer, while every non-design-system component around
 * them rendered normally.
 *
 * **The parent not re-rendering is the whole test, and getting that wrong is how a
 * regression test becomes decorative.** The first version of this file used Testing
 * Library's `rerender`, which re-renders from the root and therefore re-renders the
 * component whether or not it subscribes to anything. It passed with the fix removed,
 * which makes it worthless. `React.memo` below reproduces the real condition: the
 * provider re-renders with a new value, the subtree's props are unchanged so React skips
 * it, and only a genuine context consumer inside it renders again.
 */

import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/",
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

/* Types are erased, so this stays a static import even though the values below are
   loaded after `vi.mock` has been applied. */
import type { DesignSystemStatus } from "@/ds/status";

const { DS_NAMESPACE } = await import("@/ds/load");
const { DesignSystemStatusContext } = await import("@/ds/status");
const { Footer } = await import("@/ds");

type Namespaced = Record<string, unknown>;

afterEach(() => {
  cleanup();
  delete (globalThis as Namespaced)[DS_NAMESPACE];
});

/** The bundle's effect: components appear on a global that was not there before. */
function installBundle() {
  (globalThis as Namespaced)[DS_NAMESPACE] = {
    Footer: () => React.createElement("footer", null, "Head office"),
  };
}

/**
 * Stands in for `Shell`: renders design system chrome once and is never re-rendered by
 * its parent, because its props do not change. Exactly the position the real navbar and
 * footer are in.
 */
const StableChrome = React.memo(function StableChrome() {
  renders += 1;
  return <Footer />;
});

let renders = 0;

function Harness({ status }: { status: DesignSystemStatus }) {
  return (
    <DesignSystemStatusContext.Provider value={status}>
      <StableChrome />
    </DesignSystemStatusContext.Provider>
  );
}

describe("design system chrome under a parent that does not re-render", () => {
  it("renders nothing while the bundle is absent", () => {
    renders = 0;
    render(<Harness status="loading" />);

    expect(screen.queryByRole("contentinfo")).toBeNull();
  });

  it("appears when the bundle lands, though its parent never renders again", () => {
    renders = 0;

    const { rerender } = render(<Harness status="loading" />);
    expect(screen.queryByRole("contentinfo")).toBeNull();
    expect(renders).toBe(1);

    // What `loadDesignSystem` does, in order: the script assigns the global, then the
    // provider flips its status.
    act(() => {
      installBundle();
    });
    rerender(<Harness status="ready" />);

    /*
     * `StableChrome` is memoised and its props are unchanged, so React does not render it
     * again — `renders` stays at 1. The footer can therefore only appear if the bound
     * component beneath it subscribed to the status context itself. With that
     * subscription removed, this is the assertion that fails, and it is the exact
     * behaviour that shipped.
     */
    expect(renders, "the parent must not have re-rendered, or this proves nothing").toBe(1);
    expect(screen.getByRole("contentinfo")).toHaveTextContent("Head office");
  });
});
