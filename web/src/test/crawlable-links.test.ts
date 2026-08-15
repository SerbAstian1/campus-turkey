/**
 * Internal links have to be links.
 *
 * The screens spent the whole post-migration period rendering `href="#/university/itu"`
 * and relying on a delegated click listener to turn that into a real navigation. It
 * worked perfectly for anyone using a mouse, which is why it survived a routing
 * migration whose entire purpose was search visibility.
 *
 * It did not work for the reader that matters most here. A crawler does not run click
 * handlers; it reads the `href` attribute. `#/university/itu` is a fragment of the page
 * it is already on, so the university, service and article pages had no internal link
 * pointing at them at all — reachable only from the sitemap, with no link equity
 * flowing anywhere. The navbar, the mega menu and the footer were the worst of it: forty
 * of the site's links, on every page, all pointing at the page they were already on.
 *
 * A rendering test would not catch a regression here, because the rendered DOM is fine —
 * the listener repairs it. The defect only exists in the source that is served. So this
 * reads the source.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..");

/** Every `.ts`/`.tsx` under `src/`, excluding tests and the router itself. */
function sources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "test" || entry === "__tests__") continue;
      sources(full, out);
    } else if (/\.tsx?$/.test(entry) && !/\.(test|spec)\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * `router.ts` is allowed to mention the hash form: it is what parses and redirects it.
 * `topics.ts` builds a link nothing currently calls — left as it was rather than
 * changed blind, and named here so this test states the exemption instead of hiding it.
 */
const EXEMPT = ["app/router.ts", "features/leads/topics.ts"];

const relative = (file: string) => file.slice(ROOT.length + 1).replace(/\\/g, "/");

/**
 * Blank out comments, preserving newlines so reported line numbers stay true.
 *
 * Needed because several of these files explain the bug by quoting it — the comment on
 * `useMega` names `href: "#/study-in-turkiye"` as the thing it stopped doing. Without
 * this the test fails on its own documentation, which would teach the next person to
 * delete the explanation rather than fix the code.
 */
const withoutComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (match) =>
    match.replace(/[^\n]/g, " "),
  );

describe("internal links are crawlable", () => {
  it("no source assigns a hash route to an href prop or attribute", () => {
    const offenders: string[] = [];

    for (const file of sources(ROOT)) {
      const name = relative(file);
      if (EXEMPT.includes(name)) continue;

      const source = withoutComments(readFileSync(file, "utf8"));

      /*
       * Matches both shapes the codebase uses, which is the point — the first sweep of
       * this problem only looked for the JSX attribute and missed the mega menu, the
       * navbar and every CTA banner, because those pass the URL as a prop value:
       *
       *   href="#/study"            attribute
       *   primaryHref="#/contact"   attribute, prefixed name
       *   href: "#/study"           object property
       */
      const attribute = /\b\w*[Hh]ref\s*=\s*[{"'`]*#\//g;
      const property = /\b\w*[Hh]ref\s*:\s*["'`]#\//g;

      for (const pattern of [attribute, property]) {
        for (const match of source.matchAll(pattern)) {
          const line = source.slice(0, match.index).split("\n").length;
          offenders.push(`${name}:${line}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("the mega menu is a hook, so its twenty links can carry a locale", () => {
    const source = readFileSync(join(ROOT, "app/mega.tsx"), "utf8");

    // It was `export const MEGA`, evaluated at import, which is why its links could only
    // ever be locale-less literals. A constant here is the regression.
    expect(source).toMatch(/export function useMega\(\)/);
    expect(source).not.toMatch(/export const MEGA/);
  });
});
