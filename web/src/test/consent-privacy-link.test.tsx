/**
 * The consent line's privacy link resolves to a real, locale-correct address.
 *
 * Asserted through the DOM rather than by reading the source, for the reason this
 * codebase has already been caught by twice: a link can typecheck, build and ship while
 * pointing at nothing. `placeholder-links.test.ts` exists because a prop was passed to a
 * component that does not accept one, and `crawlable-links.test.ts` because forty-three
 * hrefs were repaired on click instead of at render. Both looked correct in the source.
 *
 * The two things worth holding here:
 *
 *   1. The anchor carries a real `href`, so a reader can open the notice in a new tab
 *      and a crawler can follow it. A consent line pointing at a click handler is not a
 *      consent line.
 *   2. The href carries the reader's locale. Without it a French reader is sent to
 *      `/privacy` and bounced to `/fr/privacy` by the middleware, which is a redirect on
 *      the one link that exists to be read before agreeing to something.
 */

import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

/** `useHref` reaches the Next router only through `usePathname`, which needs a stub. */
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/",
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

const { ConsentPrivacyNote } = await import("@/screens/shared");
const { LocaleProvider } = await import("@/i18n/context");

afterEach(cleanup);

describe("the privacy link under a consent checkbox", () => {
  it("is an anchor with a real href, not a click handler", () => {
    render(<ConsentPrivacyNote />);

    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/privacy");
  });

  it("keeps the reader in their own language", () => {
    render(
      <LocaleProvider locale="fr" messages={{}}>
        <ConsentPrivacyNote />
      </LocaleProvider>,
    );

    // Not `/privacy`. That address is English, and reaching it from `/fr/contact` costs
    // a 307 on the way to the notice someone is being asked to read first.
    expect(screen.getByRole("link").getAttribute("href")).toBe("/fr/privacy");
  });

  it("names what it links to, so the link text stands on its own", () => {
    render(<ConsentPrivacyNote />);

    // "Click here" is the failure this guards against: a screen reader listing links
    // out of context gets nothing from it.
    expect(screen.getByRole("link").textContent).toMatch(/handle your information/i);
  });
});
