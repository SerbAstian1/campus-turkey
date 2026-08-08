/**
 * One-time setup. Copies the design tokens and the brand assets out of the prototype
 * into app/public, where Vite serves them.
 *
 * These are not committed into app/ because the design system is the source of truth
 * for the tokens, and duplicating them is how the two drift apart. Re-run this after
 * the design system changes.
 *
 *   node scripts/setup.mjs
 */
import { cp, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function findDesignSystem() {
  const dsRoot = join(root, "_ds");
  if (!existsSync(dsRoot)) return null;
  const dirs = await readdir(dsRoot, { withFileTypes: true });
  const match = dirs.find((d) => d.isDirectory() && d.name.startsWith("campus-turkey-design-system"));
  return match ? join(dsRoot, match.name) : null;
}

const ds = await findDesignSystem();
if (!ds) {
  console.error("Could not find _ds/campus-turkey-design-system-*. Run this from the project root.");
  process.exit(1);
}

const jobs = [
  [join(ds, "tokens"), join(root, "app/public/ds/tokens")],
  // The design system's own assets, kept as a sibling of tokens/ because fonts.css
  // reaches them with `url("../assets/fonts/...")`. Copying tokens/ without this
  // leaves every @font-face pointing at a 404 and the brand type silently falls
  // back to system fonts. Distinct from the root assets/ below, which is artwork.
  [join(ds, "assets"), join(root, "app/public/ds/assets")],
  [join(root, "assets"), join(root, "app/public/assets")],
  // The component bundle itself. It is a classic script that reads a global `React`
  // and assigns to `window.CampusTurkeyDesignSystem_4d33e7`, so it is served from
  // public/ and loaded by a <script> tag rather than imported — see src/ds/load.ts.
  [join(ds, "_ds_bundle.js"), join(root, "app/public/ds/_ds_bundle.js")],
  // Lucide, pinned to the version the prototype loads from unpkg. The design system's
  // Icon component calls window.lucide.createElement, so it needs the UMD build and
  // not lucide-react. 0.454.0 still ships the brand marks (Instagram, Facebook,
  // LinkedIn, YouTube) that later versions removed and the footer uses.
  [join(root, "node_modules/lucide/dist/umd/lucide.min.js"), join(root, "app/public/ds/lucide.min.js")],
];

for (const [from, to] of jobs) {
  if (!existsSync(from)) {
    console.warn(`Skipped, not found: ${from}`);
    continue;
  }
  await mkdir(dirname(to), { recursive: true });
  await cp(from, to, { recursive: true });
  console.log(`Copied ${from.replace(root + "/", "")} -> ${to.replace(root + "/", "")}`);
}

console.log("\nSetup done. Now: npm install && npm run dev");
