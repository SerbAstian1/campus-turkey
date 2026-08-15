/**
 * Page titles and descriptions have to be translatable, and nothing else was checking.
 *
 * Twenty-six of them sat hardcoded in English through the entire i18n build while every
 * page advertised seventeen `hreflang` alternates. The result was the worst of both: a
 * search engine told that a French version existed, followed it, and was handed an
 * English `<title>` and an English meta description — which is the copy that decides
 * whether anyone clicks in the first place.
 *
 * The reason it went unnoticed is worth keeping, because it is a gap in the tooling
 * rather than an oversight. `i18n-extract.mjs` finds unwrapped display strings with a
 * `DISPLAY_PROP` pattern that matches a JSX *attribute* — `title="…"`. Page metadata is
 * an object *property* — `title: "…"` — inside a `pageMetadata({ … })` call. The
 * extractor's report was accurate and these were never in it.
 *
 * So this asserts the shape the extractor cannot see.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const APP = join(__dirname, "..", "..", "app");

function pages(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) pages(full, out);
    else if (entry === "page.tsx") out.push(full);
  }
  return out;
}

const relative = (file: string) => file.slice(APP.length + 1).replace(/\\/g, "/");

/** Comments blanked, newlines kept so line numbers stay true. */
const withoutComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (match) => match.replace(/[^\n]/g, " "));

describe("page metadata", () => {
  it("never assigns a bare string literal to title or description", () => {
    const offenders: string[] = [];

    for (const file of pages(APP)) {
      const source = withoutComments(readFileSync(file, "utf8"));
      if (!source.includes("pageMetadata(")) continue;

      /*
       * Both layouts the pages use. A value that is an expression is fine and is what
       * the dynamic routes legitimately do — a university name out of the database, an
       * article body sliced to length — so only a quoted literal is a failure.
       */
      const inline = /^\s*(title|description): "/gm;
      const wrapped = /^\s*(title|description):\n\s*"/gm;

      for (const pattern of [inline, wrapped]) {
        for (const match of source.matchAll(pattern)) {
          const line = source.slice(0, match.index).split("\n").length;
          offenders.push(`${relative(file)}:${line}  ${match[1]}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("every page that builds metadata can reach a translator", () => {
    const missing: string[] = [];

    for (const file of pages(APP)) {
      const source = withoutComments(readFileSync(file, "utf8"));
      if (!source.includes("pageMetadata(")) continue;

      /*
       * A real `t("…")` call, not any identifier that happens to end in `t` — the same
       * boundary `i18n-extract.mjs` uses, and for the same reason. A looser check here
       * matched `notFound(`, `getArticle(` and `getInstitution(`, and reported the three
       * dynamic routes as broken when they are the ones correctly taking their title
       * from content instead of the catalogue.
       */
      const callsTranslator = /(?<![A-Za-z0-9_$.])t\(\s*["']/.test(source);
      if (callsTranslator && !source.includes("getTranslator")) {
        missing.push(relative(file));
      }
    }

    expect(missing).toEqual([]);
  });
});
