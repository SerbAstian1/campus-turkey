/**
 * Every icon name the site asks for must be one Lucide actually has.
 *
 * **The failure this catches is silent.** `Icon` resolves a name through the design
 * system's `PASCAL` helper and, if the lookup misses, renders an empty `<span>` sized to
 * the icon and returns. No console warning, no fallback glyph, no test failure — just a
 * hole in the layout the exact width of the icon that should have been there.
 *
 * It had already happened eleven times before anyone noticed, across ten files, all with
 * the same name. `PASCAL` is:
 *
 *     n.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase())
 *
 * The character class is `[a-z]`, so a hyphen followed by a digit is never consumed:
 * `building-2` becomes `Building-2`, while Lucide keys that icon `Building2`. The lookup
 * misses and nothing renders. `graduation-cap` resolves perfectly, which is why the rule
 * is invisible when reading a call that happens to work.
 *
 * So this asserts against the real bundle rather than a hand-kept list. A name that
 * survives here is one the browser will find.
 */

import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/* Paths are relative to the package root, which is vitest's working directory — the
   same convention `copy-rules.test.ts` uses to walk the source tree. */
function walk(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, found);
    else if (/\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path)) found.push(path);
  }
  return found;
}

/**
 * The names Lucide exports, taken from the bundle the browser actually loads.
 *
 * It assigns every icon onto the namespace as `a.Building=G4`, so the export list is
 * recoverable without evaluating the file.
 */
const AVAILABLE: Set<string> = (() => {
  const bundle = readFileSync("public/ds/lucide.min.js", "utf8");
  const names = new Set<string>();
  for (const match of bundle.matchAll(/\ba\.([A-Z][A-Za-z0-9]*)\s*=/g)) {
    names.add(match[1]!);
  }
  return names;
})();

/** The design system's own resolver, copied verbatim from `components/core/Icon.jsx`. */
const PASCAL = (n: string) => n.replace(/(^|-)([a-z])/g, (_, __, c: string) => c.toUpperCase());

/**
 * Icon names written as literals in the source.
 *
 * Both spellings the codebase uses: `icon="log-in"` in JSX and `icon: "log-in"` in the
 * content and navigation data. `<Icon name="x" />` too, narrowed to that element so the
 * `name` attribute of every form field is not swept up with it.
 *
 * Dynamic values (`<Icon name={role.icon} />`) cannot be resolved statically and are not
 * attempted; the data they read from is itself covered by the `icon:` pattern.
 */
function iconNamesIn(source: string): string[] {
  const found: string[] = [];
  for (const re of [
    /\bicon=["']([a-z][a-z0-9-]*)["']/g,
    /\bicon:\s*["']([a-z][a-z0-9-]*)["']/g,
    /<Icon\b[^>]*?\bname=["']([a-z][a-z0-9-]*)["']/g,
  ]) {
    for (const match of source.matchAll(re)) found.push(match[1]!);
  }
  return found;
}

const FILES = walk("src").filter((f) => !f.replace(/\\/g, "/").includes("src/test/"));

describe("the bundle this asserts against", () => {
  it("yields a plausible icon set", () => {
    // If the extraction regex ever stops matching, every assertion below would pass
    // vacuously. Lucide 0.454 ships well over a thousand icons.
    expect(AVAILABLE.size).toBeGreaterThan(1000);
    expect(AVAILABLE.has("Building")).toBe(true);
    expect(AVAILABLE.has("Building2")).toBe(true);
  });

  it("reproduces the resolver's blind spot", () => {
    // The bug itself, stated as behaviour rather than as prose.
    expect(PASCAL("graduation-cap")).toBe("GraduationCap");
    expect(PASCAL("building-2")).toBe("Building-2");
    expect(AVAILABLE.has(PASCAL("building-2"))).toBe(false);
  });
});

describe("every icon the site asks for", () => {
  it("resolves to one Lucide actually exports", () => {
    const broken: string[] = [];

    for (const file of FILES) {
      const source = readFileSync(file, "utf8");
      for (const name of new Set(iconNamesIn(source))) {
        if (!AVAILABLE.has(PASCAL(name))) {
          broken.push(`${file}: "${name}" resolves to "${PASCAL(name)}"`);
        }
      }
    }

    // Named rather than counted: "expected 3 to be 0" sends the next person hunting.
    expect(broken, `Icon names that render nothing:\n${broken.join("\n")}`).toEqual([]);
  });

  it("scans a meaningful number of files", () => {
    // Guards the walk, for the same reason the bundle size is checked above.
    expect(FILES.length).toBeGreaterThan(30);
  });
});
