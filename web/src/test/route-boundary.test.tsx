/**
 * The route error boundary must not swallow the framework's control flow.
 *
 * Next.js implements `notFound()` and `redirect()` by throwing. A React error boundary
 * that catches everything catches those too, and the failure is silent in the worst
 * way: the page renders "something went wrong" and the response carries **200**. Every
 * soft 404 the routing migration existed to remove comes straight back, and no test
 * that only checks "the error screen appears" would notice.
 *
 * Caught in a real build — `/universities/not-a-real-slug` returned 200 with the failure
 * panel instead of a 404 with the not-found page.
 */

import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/universities/anything",
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

const { RouteBoundary } = await import("@/app/Shell");

/**
 * Throws on render, like a screen that fails.
 *
 * The `never` return is what makes it a valid JSX component: a function typed as
 * returning `void` is not, even though it never returns at all.
 */
function Thrower({ error }: { error: unknown }): never {
  throw error;
}

/** An error shaped the way Next shapes its control-flow signals. */
const withDigest = (digest: string) => Object.assign(new Error(digest), { digest });

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("RouteBoundary", () => {
  it("catches a genuine render failure and shows the recoverable panel", () => {
    // The behaviour the boundary exists for: one broken screen must not blank the site.
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <RouteBoundary routeKey="x">
        <Thrower error={new Error("the screen exploded")} />
      </RouteBoundary>,
    );

    // ErrorScreen's `failed` state. Asserted on the role rather than exact copy, which
    // is EDSAI's to change.
    expect(document.body.textContent).toBeTruthy();
    expect(screen.queryByText(/the screen exploded/i)).not.toBeNull();
  });

  it.each([
    ["NEXT_NOT_FOUND"],
    ["NEXT_HTTP_ERROR_FALLBACK;404"],
    ["NEXT_REDIRECT;replace;/portal;307;"],
  ])("re-throws %s so the framework can answer it", (digest) => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    // The boundary must let this past. If it swallows it, the render succeeds and the
    // assertion below fails — which is precisely the production symptom.
    expect(() =>
      render(
        <RouteBoundary routeKey="x">
          <Thrower error={withDigest(digest)} />
        </RouteBoundary>,
      ),
    ).toThrow();
  });

  it("does not mistake an ordinary error carrying an unrelated digest for control flow", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <RouteBoundary routeKey="x">
        <Thrower error={Object.assign(new Error("chunk load failed"), { digest: "1234567890" })} />
      </RouteBoundary>,
    );

    expect(screen.queryByText(/chunk load failed/i)).not.toBeNull();
  });
});
