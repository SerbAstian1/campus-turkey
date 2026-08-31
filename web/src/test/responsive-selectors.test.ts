/**
 * The responsive rules have something to match.
 *
 * **A CSS selector that matches nothing is the quietest failure in a frontend.** There is
 * no error, no warning, and no failing test: the rule simply never applies and the page
 * renders as though it had never been written. Every other layer of this project reports
 * its own problems — the config refuses to boot, the build refuses to ship without the
 * design system, the type checker refuses a bad prop. A stylesheet refuses nothing.
 *
 * That is how the mobile navigation shipped broken. `styles/base.css` was transcribed
 * from the prototype rule for rule, and the prototype mounted React into
 * `<div id="root">`, so eight rules are scoped to `#root`. The port reproduced the
 * prototype's DOM faithfully and dropped that one attribute. Every one of those rules
 * stopped applying at once, including the `max-width:768px` rule that hides the desktop
 * header so the compact mobile bar can replace it. Both navigations rendered, the
 * desktop header pushed the page wider than the viewport, and on a 360px phone the
 * heading, the body copy and the buttons were clipped mid-word.
 *
 * So this asserts the contract in both directions: the stylesheet's scoping element
 * exists in the markup, and the elements those rules reach for are the ones the
 * components actually render. Neither half is worth much alone.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const web = join(__dirname, "..", "..");
const css = readFileSync(join(web, "src", "styles", "base.css"), "utf8");
const shell = readFileSync(join(web, "src", "app", "Shell.tsx"), "utf8");
const mobileNav = readFileSync(join(web, "src", "app", "MobileNav.tsx"), "utf8");

/**
 * Comments blanked, newlines kept so line numbers survive.
 *
 * Needed for the "exactly once" check below: the docblock explaining why `id="root"`
 * matters names it twice, so counting raw occurrences finds three and fails on a file
 * that is correct. Counting what the browser will see is the thing that was meant.
 */
const withoutComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, " "));

const shellCode = withoutComments(shell);

/** Selectors in the stylesheet that are scoped to the prototype's mount element. */
const rootScopedRules = [...css.matchAll(/#root[^{,]*/g)].map((m) => m[0].trim());

describe("the element the prototype's rules are scoped to", () => {
  it("is still used by the stylesheet, so this test is not vestigial", () => {
    expect(rootScopedRules.length).toBeGreaterThan(0);
  });

  it("exists in the markup", () => {
    /*
     * The whole defect in one assertion. `Shell` is the component that must carry it,
     * because `#root>div>header` counts depth from there: the id has to sit on the
     * element whose direct child holds the header, not on a wrapper further out.
     */
    expect(shellCode, "Shell must render the element base.css scopes its rules to").toContain('id="root"');
  });

  it("is declared exactly once, since two would be invalid", () => {
    expect(shellCode.match(/id="root"/g)).toHaveLength(1);
  });
});

describe("the mobile navigation switch has both halves", () => {
  const phoneBreakpoint = /@media \(max-width:768px\)\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";

  it("hides the desktop header on a phone", () => {
    expect(phoneBreakpoint).toContain("#root>div>header{display:none!important}");
  });

  it("hides the desktop navigation pill and shows the compact bar", () => {
    expect(phoneBreakpoint).toContain(".ct-desktop-nav{display:none!important}");
    expect(phoneBreakpoint).toContain(".ct-mobile-nav{display:block}");
  });

  it("renders both of the classes that switch", () => {
    // The rules above are inert unless something wears these. `.ct-desktop-nav` wraps the
    // design system navbar in Shell; `.ct-mobile-nav` is the phone bar's own wrapper.
    expect(shellCode).toContain("ct-desktop-nav");
    expect(mobileNav).toContain("ct-mobile-nav");
  });
});

describe("rules that reach for a class a component must wear", () => {
  /**
   * Every hook the responsive rules depend on, and the file that has to render it.
   *
   * These are the classes whose absence would silently un-collapse a layout: the
   * two-column splits, the portal chrome, the FAQ and detail grids, and the card grid.
   */
  const hooks: [string, string][] = [
    ["ct-page", "src/app/Shell.tsx"],
    ["ct-desktop-nav", "src/app/Shell.tsx"],
    ["ct-mobile-nav", "src/app/MobileNav.tsx"],
  ];

  for (const [hook, file] of hooks) {
    it(`${hook} is rendered by ${file}`, () => {
      expect(css, `base.css should style .${hook}`).toContain(hook);
      expect(readFileSync(join(web, file), "utf8"), `${file} should render .${hook}`).toContain(hook);
    });
  }

  it("collapses the portal sign-in split without depending on #root", () => {
    /*
     * The portal is the one area that does not render inside `Shell`, so nothing above
     * it carries the id. A rule scoped to `#root` could never fire there, which is why
     * this one is deliberately unscoped.
     */
    const narrow = /@media \(max-width:760px\)\{([^}]*\}?)*?\}\}/.exec(css)?.[0] ?? css;
    expect(narrow).toContain(String.raw`[style*="grid-template-columns: 1.05fr"]`);
    expect(narrow).not.toContain(String.raw`#root [style*="grid-template-columns: 1.05fr"]`);

    /*
     * And it must not name the tag either, which was the second half of the same bug.
     * The rule said `section`; `PartnerLogin` renders the split as a `div`. Either
     * mistake alone stopped it matching, so the sign-in page stayed two-column on a
     * phone with the form pushed off the right edge.
     */
    expect(narrow).not.toMatch(/[a-z]+\[style\*="grid-template-columns: 1\.05fr"\]/);
  });

  it("gives the footer's fixed columns a way to collapse", () => {
    /*
     * The single reason every page overflowed on a phone. The design system writes
     * `repeat(4, minmax(140px, auto))` inline on the footer's link columns, which cannot
     * shrink below about 680px — measured at 700px against a 345px container. Inline
     * styles are unreachable from an ordinary rule, so the override needs `!important`.
     */
    expect(css, "base.css must override the footer's inline column floor").toContain(
      String.raw`footer div[style*="repeat(4, minmax(140px"]`,
    );
    expect(css).toMatch(/footer div\[style\*="repeat\(4, minmax\(140px"\]\s*\{[^}]*!important/);
  });
});
