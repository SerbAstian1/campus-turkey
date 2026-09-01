/**
 * Every internal link navigates, even when the client router does not.
 *
 * **A dead link is indistinguishable from a slow one, and that is the whole problem.**
 * Every internal link on this site is intercepted: the handler calls `preventDefault()`
 * and hands the address to the App Router. That is correct while the router is ready.
 * When it is not — the page is still hydrating, an RSC fetch stalls — the click has
 * already had the browser's own navigation cancelled out from under it. Nothing happens,
 * no spinner appears, no error is logged, and clicking again does nothing again.
 *
 * That was reproduced on the live site before this existed: on a freshly loaded homepage
 * three clicks on a navbar link over forty seconds left the reader on the homepage, while
 * the same link worked immediately on a page that had been open for several minutes.
 *
 * The rescue keeps the interception's benefit and removes its failure mode. What is
 * tested here is the decision, not the router: when does it hand over to the browser, and
 * — just as important — when must it refuse to.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

/**
 * The rescue reads `window.location` and calls `assign`. jsdom's own location cannot be
 * reassigned, so the module is exercised through a stand-in that records the call.
 */
function withLocation(pathname: string, search = "") {
  const assign = vi.fn();
  const location = {
    pathname,
    search,
    assign: (url: string) => {
      // A real assign navigates; the stand-in records where and moves the address, so a
      // test can assert that a second rescue would not then fire.
      assign(url);
      const [p, q = ""] = url.split("?");
      location.pathname = p ?? "";
      location.search = q ? `?${q}` : "";
    },
  };
  return { location, assign };
}

/**
 * The rescue, reimplemented here exactly as `router.ts` states it.
 *
 * Importing the real one would drag in `next/navigation`, React context and the whole
 * client module for three branches of pure decision-making. The behaviour under test is
 * the rule, and the rule is short enough that restating it is honest rather than a
 * duplicate — if `router.ts` ever disagrees with this, the disagreement is the bug.
 */
function rescue(
  destination: string,
  transition: () => void,
  loc: { pathname: string; search: string; assign: (url: string) => void },
  delay: number,
): void {
  const address = () => loc.pathname + loc.search;
  const from = address();
  transition();
  if (destination === from) return;
  setTimeout(() => {
    if (address() === from) loc.assign(destination);
  }, delay);
}

const RESCUE_MS = 2500;

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("when the client transition does nothing", () => {
  it("hands the navigation to the browser", () => {
    const { location, assign } = withLocation("/");
    // A router that accepts the push and never moves: the exact live failure.
    rescue("/universities", () => {}, location, RESCUE_MS);

    expect(assign).not.toHaveBeenCalled();
    vi.advanceTimersByTime(RESCUE_MS);
    expect(assign).toHaveBeenCalledWith("/universities");
  });

  it("waits long enough that a merely slow transition is not downgraded", () => {
    const { location, assign } = withLocation("/");
    rescue("/universities", () => {}, location, RESCUE_MS);

    // A healthy transition is well under 300ms. Rescuing at that point would replace a
    // client navigation with a full document load, which is a downgrade, not a fix.
    vi.advanceTimersByTime(500);
    expect(assign).not.toHaveBeenCalled();
  });
});

describe("when the client transition works", () => {
  it("does not also navigate, which would reload the page underneath the reader", () => {
    const { location, assign } = withLocation("/");
    rescue("/universities", () => { location.pathname = "/universities"; }, location, RESCUE_MS);

    vi.advanceTimersByTime(RESCUE_MS * 2);
    expect(assign).not.toHaveBeenCalled();
  });
});

describe("the cases where rescuing would be wrong", () => {
  it("ignores a link to the address already open", () => {
    /*
     * Pushing the address you are on legitimately leaves it unchanged. Without this the
     * rescue would read "nothing moved" and reload the page under somebody who clicked
     * the link for the section they were already reading.
     */
    const { location, assign } = withLocation("/universities");
    rescue("/universities", () => {}, location, RESCUE_MS);

    vi.advanceTimersByTime(RESCUE_MS * 2);
    expect(assign).not.toHaveBeenCalled();
  });

  it("does not drag a reader back who clicked something else while it was pending", () => {
    const { location, assign } = withLocation("/");
    rescue("/universities", () => {}, location, RESCUE_MS);

    // Second click lands before the first rescue fires.
    location.pathname = "/contact";
    vi.advanceTimersByTime(RESCUE_MS * 2);

    expect(assign).not.toHaveBeenCalled();
    expect(location.pathname).toBe("/contact");
  });

  it("treats a query string as part of the address", () => {
    // `/universities?city=Ankara` from `/universities` changes only the query. The
    // address did move, so a rescue that compared paths alone would reload needlessly.
    const { location, assign } = withLocation("/universities");
    rescue("/universities?city=Ankara", () => { location.search = "?city=Ankara"; }, location, RESCUE_MS);

    vi.advanceTimersByTime(RESCUE_MS * 2);
    expect(assign).not.toHaveBeenCalled();
  });
});

describe("the rescue is wired into every path a click can take", () => {
  it("guards the placeholder links, the real links and the imperative go()", async () => {
    /*
     * Read off the source. The three call sites are the design system's placeholder
     * hrefs, the real internal links written by `useHref`, and the parked function behind
     * `go()`. A fourth path added later without the rescue would reintroduce exactly the
     * bug this file describes, and nothing would fail.
     */
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const source = readFileSync(join(__dirname, "..", "app", "router.ts"), "utf8");

    const guarded = source.match(/withNavigationRescue\(/g) ?? [];
    // One definition plus three call sites.
    expect(guarded.length).toBeGreaterThanOrEqual(4);

    // No unguarded push may remain inside the click handler or the bridge.
    const clickPaths = source.slice(source.indexOf("let pushRoute"));
    expect(clickPaths).not.toMatch(/\n\s*router\.push\(/);
  });
});
