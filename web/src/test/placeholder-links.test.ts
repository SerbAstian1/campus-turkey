/**
 * Placeholder link resolution.
 *
 * The design system ships components with fixed `#placeholder` hrefs that this app
 * maps onto real routes at click time. One of them is ambiguous and caused a real bug:
 * `Navbar` hardcodes `href="#consultation"` on its secondary button and offers no prop
 * to change it, so relabelling that button "Partner Login" left it pointing at the
 * contact page.
 *
 * The first attempt at the fix passed a `secondaryHref` prop. `Navbar` does not accept
 * one — it typechecked, it built, and it changed nothing. Hence these tests: the
 * behaviour is only observable through the DOM, so that is where it is asserted.
 */

import { describe, it, expect, afterEach } from "vitest";
import { resolvePlaceholder } from "@/app/router";

/** Build a detached tree and return the anchor inside it. */
function anchorIn(html: string): Element {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  const anchor = host.querySelector("a");
  if (!anchor) throw new Error("fixture has no anchor");
  return anchor;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("the navbar's Partner Login button", () => {
  it("resolves to the portal, not the contact page", () => {
    // The reported bug, in one assertion.
    const anchor = anchorIn(
      `<div class="ct-desktop-nav"><a href="#consultation">Partner Login</a></div>`,
    );
    expect(resolvePlaceholder(anchor)).toBe("portal");
  });

  it("resolves from a click on an element inside the button", () => {
    // The delegated listener uses `closest("a[href]")`, so the event target is usually
    // the span holding the label rather than the anchor itself.
    const anchor = anchorIn(
      `<div class="ct-desktop-nav"><nav><a href="#consultation"><span>Partner Login</span></a></nav></div>`,
    );
    expect(resolvePlaceholder(anchor)).toBe("portal");
  });

  it("lands on a route that renders the login screen", () => {
    // `portal` with no second segment is `PartnerLogin`; `portal/dashboard` is the
    // dashboard. See the `portal` case in app/screens.tsx.
    expect(resolvePlaceholder(anchorIn(
      `<div class="ct-desktop-nav"><a href="#consultation">x</a></div>`,
    ))).toBe("portal");
  });
});

describe("consultation links elsewhere still mean consultation", () => {
  it("resolves to contact outside the navbar", () => {
    const anchor = anchorIn(`<section><a href="#consultation">Book a Consultation</a></section>`);
    expect(resolvePlaceholder(anchor)).toBe("contact");
  });

  it("is not affected by a navbar elsewhere in the document", () => {
    // Guards the scoping itself: `closest` must walk the anchor's own ancestors, not
    // search the page for a navbar.
    document.body.innerHTML = `<div class="ct-desktop-nav"><a href="#home">Home</a></div>`;
    const anchor = anchorIn(`<footer><a href="#consultation">Book a Consultation</a></footer>`);
    expect(resolvePlaceholder(anchor)).toBe("contact");
  });
});

describe("the remaining placeholders", () => {
  it.each([
    ["#home", "home"],
    ["#apply", "apply"],
    ["#whatsapp", "contact"],
  ])("maps %s to %s", (href, route) => {
    expect(resolvePlaceholder(anchorIn(`<footer><a href="${href}">x</a></footer>`))).toBe(route);
  });
});

describe("real links are left alone", () => {
  it.each(["#/apply", "#/contact", "#/portal", "#/universities/itu", "#partner-form", "/study"])(
    "does not intercept %s",
    (href) => {
      expect(resolvePlaceholder(anchorIn(`<div><a href="${href}">x</a></div>`))).toBeNull();
    },
  );

  it("does not intercept a real link inside the navbar", () => {
    // Every genuine nav destination is `#/route`. Only the bare placeholder is claimed.
    const anchor = anchorIn(`<div class="ct-desktop-nav"><a href="#/apply">Apply Now</a></div>`);
    expect(resolvePlaceholder(anchor)).toBeNull();
  });

  it("does not intercept an anchor with no href value", () => {
    const anchor = anchorIn(`<div><a href="">x</a></div>`);
    expect(resolvePlaceholder(anchor)).toBeNull();
  });
});
