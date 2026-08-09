/**
 * Copy rules from the brief, enforced.
 *
 * §73: never use em dashes in website copy. Campus Turkey's audience is largely reading
 * in a second or third language, and an em dash is a piece of punctuation that carries no
 * spoken equivalent and no equivalent in several of the seventeen languages this site
 * ships in. A full stop or a comma survives translation; a dash becomes noise.
 *
 * The rule was written down and then broken eight times within a week of being written,
 * by me, in copy that shipped. A rule with no test is a preference.
 *
 * **Comments are exempt and code is not scanned for style.** This looks only at what a
 * visitor can read. The distinction is made by stripping comments before scanning, which
 * is why an em dash in a docblock (there are many, deliberately) does not fail the build.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Directories whose contents reach a visitor's screen. */
const SCANNED = ["src/content", "src/screens", "src/components", "src/app"];

/**
 * Test files are excluded: this one has to contain the character it forbids in order to
 * describe it, and so will any future test asserting on copy.
 */
const isScannable = (path: string): boolean =>
  /\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path) && !path.includes(`${"src"}${"/"}test`);

function walk(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, found);
    else if (isScannable(path.replace(/\\/g, "/"))) found.push(path);
  }
  return found;
}

/**
 * Remove comments so only strings and JSX text remain.
 *
 * Block comments first, then whole-line `//` comments. The line form is anchored to the
 * start of the line so that a URL's `//` inside a string is left alone.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const EM_DASH = "—";

interface Offence {
  file: string;
  line: number;
  text: string;
}

function findEmDashes(): Offence[] {
  const offences: Offence[] = [];

  for (const dir of SCANNED) {
    for (const file of walk(dir)) {
      const lines = stripComments(readFileSync(file, "utf8")).split("\n");
      lines.forEach((line, i) => {
        if (line.includes(EM_DASH)) {
          offences.push({
            file: file.replace(/\\/g, "/"),
            line: i + 1,
            text: line.trim().slice(0, 90),
          });
        }
      });
    }
  }

  return offences;
}

describe("brief §73 — no em dashes in website copy", () => {
  it("finds none in any visitor-facing string", () => {
    const offences = findEmDashes();

    // Reported as a readable list rather than a bare count. A failure that says
    // "expected 3 to be 0" sends the next person hunting; this one names the lines.
    const report = offences
      .map((o) => `  ${o.file}:${o.line}\n    ${o.text}`)
      .join("\n");

    expect(report, `Em dashes in visitor-facing copy:\n${report}`).toBe("");
  });

  /** Proves the scanner can actually see the character, so a green result means
   *  "none present" rather than "the check silently matched nothing". */
  it("detects the character it is looking for", () => {
    expect(stripComments(`const a = "one ${EM_DASH} two";`)).toContain(EM_DASH);
  });

  /** And proves the exemption works, so nobody removes the docblock dashes thinking
   *  the build requires it. */
  it("ignores em dashes inside comments", () => {
    expect(stripComments(`/* a comment ${EM_DASH} with a dash */\nconst a = 1;`)).not.toContain(EM_DASH);
    expect(stripComments(`  // a line comment ${EM_DASH} here\nconst a = 1;`)).not.toContain(EM_DASH);
  });
});
