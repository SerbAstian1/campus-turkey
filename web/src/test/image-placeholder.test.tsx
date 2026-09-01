/**
 * An empty frame is a claim that something is coming. Only make it where it is true.
 *
 * `ImagePlaceholder` renders a dashed box with an icon and a caption — "Article lead
 * image, 16:9" — whenever it has no `src`. On `/about` that is correct and deliberate:
 * the client is supplying team and office photography, the slots are agreed, and the
 * outline is how the page says so.
 *
 * Everywhere else it was an accident of the same component serving both jobs. Two of the
 * six articles have no free photograph of the right country, hospitals and chambers have
 * no institution photograph worth using, and `rep-office` never had a source at all. Each
 * of those rendered a captioned dashed box on a live marketing page, which tells a
 * prospective student the site is half-built.
 *
 * The rule is now: **no `src` renders nothing, unless the caller says `reserved`.** The
 * default is the safe one, so a call site added later that forgets the prop shows nothing
 * rather than announcing an absence. These tests pin both halves — including that the
 * About page keeps its frames, which is a product decision and not an oversight.
 */

import { render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ImagePlaceholder } from "@/components/Common";

/** The reserved frame is the only thing that carries `data-slot` without being an image. */
const frameIn = (container: HTMLElement) => container.querySelector("div[data-slot]");
const imageIn = (container: HTMLElement) => container.querySelector("img[data-slot]");

describe("a frame with a photograph", () => {
  it("renders the image", () => {
    const { container } = render(
      <ImagePlaceholder slot="test" src="/assets/campus-life.webp" alt="A lecture hall" />,
    );

    expect(imageIn(container)).not.toBeNull();
    expect(imageIn(container)?.getAttribute("src")).toBe("/assets/campus-life.webp");
    expect(frameIn(container)).toBeNull();
  });

  it("ignores `reserved`, which only describes what to do without one", () => {
    // Otherwise the About page's frames would keep showing the dashed box on the day
    // the photography lands.
    const { container } = render(
      <ImagePlaceholder slot="test" reserved src="/assets/campus-life.webp" alt="A lecture hall" />,
    );

    expect(imageIn(container)).not.toBeNull();
    expect(frameIn(container)).toBeNull();
  });
});

describe("a frame with no photograph", () => {
  it("renders nothing by default", () => {
    /*
     * The whole point. This is the state two articles, two institutions and the
     * representative page were in on the live site, each showing a captioned dashed box.
     */
    const { container } = render(<ImagePlaceholder slot="test" label="Article lead image, 16:9" />);

    expect(container.innerHTML).toBe("");
  });

  it("holds the frame open when the caller asks for it", () => {
    const { container } = render(
      <ImagePlaceholder slot="about-hero" label="Team or office photography" reserved />,
    );

    const frame = frameIn(container);
    expect(frame).not.toBeNull();
    expect(frame?.getAttribute("data-slot")).toBe("about-hero");
    expect(container.textContent).toContain("Team or office photography");
  });
});

describe("where reserved frames are allowed to appear", () => {
  const screen = (file: string) =>
    readFileSync(join(__dirname, "..", "screens", file), "utf8");

  /** Call sites, with comments stripped so prose about the prop is not counted as use. */
  const callSites = (source: string): string[] =>
    (source.replace(/\/\*[\s\S]*?\*\//g, "").match(/<ImagePlaceholder[\s\S]*?\/>/g) ?? []);

  it("keeps every frame on the About page", () => {
    /*
     * A product decision, asserted because it is invisible in review: the About page is
     * *meant* to advertise the slots it is waiting on, and a well-meaning cleanup that
     * removed them would look like tidying rather than a change of intent.
     */
    const sites = callSites(screen("About.tsx"));
    expect(sites.length).toBeGreaterThan(0);

    const unreserved = sites.filter((site) => !/\breserved\b/.test(site));
    expect(unreserved, "every About frame must stay reserved").toEqual([]);
  });

  it("does not reserve frames on pages that are simply missing a photograph", () => {
    /*
     * The inverse, and the regression that matters. Adding `reserved` to one of these to
     * "fix a gap in the layout" puts the dashed box back on a marketing page.
     *
     * `Home.tsx` is excluded and is the one deliberate exception outside About: the
     * affiliated-universities marquee is a single row of 44px logos, where a missing one
     * would gap the row rather than end it. Every university in that row has a logo
     * today, so the branch does not currently render.
     */
    for (const file of ["Article.tsx", "Resources.tsx", "Institution.tsx", "Service.tsx", "Representative.tsx"]) {
      const reserved = callSites(screen(file)).filter((site) => /\breserved\b/.test(site));
      expect(reserved, `${file} must not hold a frame open`).toEqual([]);
    }
  });
});
