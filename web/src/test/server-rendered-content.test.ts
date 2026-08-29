/**
 * Every public page ships text the server rendered.
 *
 * The defect this guards against shipped, silently, for the whole of the routing
 * migration. `DesignSystemProvider` withheld its children until `_ds_bundle.js` had
 * loaded, so all 1,348 pages answered with a loading splash: correct `<title>`, correct
 * canonical, correct `hreflang`, and a body containing no `<h1>`, no `<main>` and no
 * readable sentence. The homepage was 12,950 bytes of nothing. On a build whose stated
 * reason for existing is organic search, that was the expensive half missing, and
 * nothing failed because everything a test usually looks at was right.
 *
 * Checked by reading the source rather than by rendering. Rendering a route means
 * standing up the database, the config guard and the design system bundle, any of which
 * failing would present as a content failure. The property that matters is structural
 * and the source states it plainly: a page under `(site)` renders its screen inside
 * `Hydrated`, and `Hydrated` is given a `server` tree to show until the bundle arrives.
 *
 * An allowlist rather than a count, for the reason `endpoint-access.test.ts` gives:
 * a count says the number changed, an allowlist says which page changed and makes the
 * person shipping a JavaScript-only public page write it down here, next to the reason
 * that would have to be a good one.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const SITE = join(__dirname, "..", "..", "app", "[locale]", "(site)");

function pages(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) pages(full, out);
    else if (entry === "page.tsx") out.push(full);
  }
  return out;
}

const routeOf = (file: string) => relative(SITE, file).split(sep).join("/");

/**
 * Public pages allowed to render nothing on the server.
 *
 * Empty, and it should stay that way. A page in `(site)` is by definition a page the
 * site wants found.
 */
const CLIENT_ONLY_ALLOWLIST = new Set<string>([]);

describe("public pages render content on the server", () => {
  const files = pages(SITE);

  it("finds the pages at all, so a green result is not an empty loop", () => {
    expect(files.length).toBeGreaterThan(15);
  });

  it("wraps every screen in Hydrated with a server-rendered fallback", () => {
    const missing: string[] = [];

    for (const file of files) {
      const route = routeOf(file);
      if (CLIENT_ONLY_ALLOWLIST.has(route)) continue;

      const source = readFileSync(file, "utf8");

      /*
       * `server={` and not `server={<`. The two university routes pass the tree as a
       * variable and across a line break respectively, both of which are correct and
       * neither of which matches an inline `<`. The first version of this test failed
       * them, which is the right kind of wrong to find here rather than in review.
       */
      const wrapped = source.includes("<Hydrated") && source.includes("server={");

      if (!wrapped) missing.push(route);
    }

    expect(
      missing,
      `These public pages would answer with a loading screen and no readable text:\n  ${missing.join("\n  ")}`,
    ).toEqual([]);
  });

  it("imports the fallback from the shared seo module rather than inventing one", () => {
    const strays: string[] = [];

    for (const file of files) {
      const route = routeOf(file);
      if (CLIENT_ONLY_ALLOWLIST.has(route)) continue;

      const source = readFileSync(file, "utf8");
      if (!source.includes("@/components/seo/routes")) strays.push(route);
    }

    expect(strays).toEqual([]);
  });
});

describe("the gate itself", () => {
  it("no longer withholds the page while the bundle loads", () => {
    const providers = readFileSync(join(__dirname, "..", "..", "app", "providers.tsx"), "utf8");

    // The old shape. Its return meant `children` never reached the server's HTML, which
    // is the whole defect above. `DesignSystemBoundary` may still do this for the portal.
    const gateInProvider = /export function DesignSystemProvider[\s\S]*?\n\}/.exec(providers)?.[0] ?? "";

    expect(gateInProvider).not.toMatch(/return <BootScreen/);
    expect(gateInProvider).toMatch(/DesignSystemStatusContext\.Provider/);
  });

  it("keeps the boot screen for the portal and the staff console", () => {
    for (const area of ["portal", "staff"]) {
      const layout = readFileSync(
        join(__dirname, "..", "..", "app", "[locale]", area, "layout.tsx"),
        "utf8",
      );
      expect(layout, `${area} should still gate on the design system`).toContain(
        "DesignSystemBoundary",
      );
    }
  });
});
