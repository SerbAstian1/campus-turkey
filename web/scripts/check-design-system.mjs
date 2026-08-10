/**
 * Refuse to build without the design system in `public/`.
 *
 * This exists because of a failure mode that no test, typecheck or build could catch,
 * and that would have shipped.
 *
 * `public/ds/` and `public/assets/` are gitignored on purpose — the design system has
 * one home, `_ds/` at the repository root, and `npm run setup` copies it in. That
 * decision is sound. What was missing is anything that makes the deploy honour it:
 * `next build` does not need `public/` to succeed, so a clean checkout builds green,
 * deploys green, and serves a site with no tokens, no fonts, no icons and no component
 * library — because `src/styles/tokens.css` imports `/ds/tokens/*.css` at runtime and
 * `src/ds/load.ts` fetches `/ds/_ds_bundle.js` from the browser.
 *
 * The result is not a degraded page. The bundle *is* the component library, so the site
 * renders as unstyled markup. Nothing anywhere reports an error; the build is green and
 * the page is blank.
 *
 * So the check is here rather than in a document: a build that cannot serve the site it
 * just built should fail, loudly, naming the command that fixes it.
 */

import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const web = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * One representative file per copied group, not an exhaustive manifest.
 *
 * A full list would have to be updated whenever the design system gains a token file,
 * and a check that goes stale is a check that gets deleted. Each entry below is the
 * file whose absence breaks its whole group.
 */
const REQUIRED = [
  ["public/ds/_ds_bundle.js", "the component library itself — without it the site renders as unstyled markup"],
  ["public/ds/lucide.min.js", "every icon in the navigation, cards and buttons"],
  ["public/ds/tokens/colors.css", "the design tokens; every CSS custom property resolves to nothing without them"],
  ["public/ds/assets/fonts", "the brand typefaces — fonts.css reaches them at ../assets/fonts/"],
  ["public/assets", "the brand marks and the map artwork"],
];

const missing = REQUIRED.filter(([path]) => !existsSync(join(web, path)));

if (missing.length > 0) {
  const lines = missing.map(([path, why]) => `  - ${path}\n      ${why}`).join("\n");

  console.error(
    [
      "",
      "The design system is not present in web/public.",
      "",
      "Missing:",
      lines,
      "",
      "These are generated, not committed. From the repository root:",
      "",
      "    npm install      # once, for the lucide copy step",
      "    npm run setup",
      "",
      "If this is a deployment: the build must run that step, or the site will serve",
      "unstyled markup with no components. See web/docs/DEPLOYMENT.md, 'Design system",
      "assets'.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}
