/**
 * Copy the design system into `web/public/`, from inside `web/`.
 *
 * **Why this exists, and why it is not the root `scripts/setup.mjs`.**
 *
 * `public/ds/` and `public/assets/` are generated, not committed, so that the design
 * system has exactly one home in `_ds/`. That decision is right and is kept. What it
 * relied on was somebody running `npm run setup` from the repository root before every
 * build, and a deployment platform does not do that.
 *
 * Vercel's Next.js preset builds with `next build` rather than `npm run build` unless a
 * build command is set explicitly. `next build` does not run npm lifecycle scripts, so
 * `prebuild` never fired, the guard that was supposed to refuse this never ran, and the
 * deploy went out green with no tokens, no fonts, no icons and no component library. The
 * site rendered, which is what made it hard to see: the HTML was correct and every
 * stylesheet behind it was a 404.
 *
 * So the copy step lives here now, reachable from `web/` alone. `npm ci && npm run build`
 * inside `web/` is enough to produce a complete site, whichever directory a platform
 * treats as the root.
 *
 * The sources are all committed, so they are present in any checkout:
 *   the design system folder under `../_ds`  tokens, fonts, the component bundle
 *   `../assets`                              brand artwork and photography
 *   lucide, an npm dependency                the icon set the design system calls into
 */

import { cp, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const web = join(dirname(fileURLToPath(import.meta.url)), "..");
const root = join(web, "..");

/** The design system folder carries a uuid, so it is found rather than hardcoded. */
async function findDesignSystem() {
  const dsRoot = join(root, "_ds");
  if (!existsSync(dsRoot)) return null;
  const entries = await readdir(dsRoot, { withFileTypes: true });
  const match = entries.find(
    (entry) => entry.isDirectory() && entry.name.startsWith("campus-turkey-design-system"),
  );
  return match ? join(dsRoot, match.name) : null;
}

/**
 * Lucide's UMD build, wherever npm put it.
 *
 * `require.resolve` rather than a path, because the package may be installed under
 * `web/node_modules` (this package's own dependency) or hoisted to the repository root
 * (the workspace install). Hardcoding either one breaks the other, and the symptom is
 * every icon on the site silently missing.
 *
 * The UMD build specifically: the design system's `Icon` calls `window.lucide`, so the
 * ES module build would resolve and then not work.
 */
function findLucide() {
  for (const base of [web, root]) {
    try {
      const require = createRequire(join(base, "package.json"));
      const pkg = require.resolve("lucide/package.json");
      const candidate = join(dirname(pkg), "dist", "umd", "lucide.min.js");
      if (existsSync(candidate)) return candidate;
    } catch {
      // Not installed at this level. Try the next one.
    }
  }
  return null;
}

const ds = await findDesignSystem();
if (!ds) {
  console.error(
    "\nCould not find _ds/campus-turkey-design-system-*.\n" +
      "It is committed, so this usually means the checkout is partial or this script\n" +
      "was moved out of web/scripts/.\n",
  );
  process.exit(1);
}

const lucide = findLucide();
if (!lucide) {
  console.error(
    "\nCould not resolve lucide's UMD build.\n" +
      "It is a dependency of web/package.json; run `npm ci` in web/ and try again.\n",
  );
  process.exit(1);
}

const jobs = [
  [join(ds, "tokens"), join(web, "public/ds/tokens")],
  // Sibling of tokens/ deliberately: fonts.css reaches these with `url("../assets/…")`,
  // so copying tokens/ alone leaves every @font-face pointing at a 404 and the brand
  // typefaces fall back to system fonts without anything reporting it.
  [join(ds, "assets"), join(web, "public/ds/assets")],
  [join(root, "assets"), join(web, "public/assets")],
  [join(ds, "_ds_bundle.js"), join(web, "public/ds/_ds_bundle.js")],
  [lucide, join(web, "public/ds/lucide.min.js")],
];

let copied = 0;
const skipped = [];

for (const [from, to] of jobs) {
  if (!existsSync(from)) {
    skipped.push(from);
    continue;
  }
  await mkdir(dirname(to), { recursive: true });
  await cp(from, to, { recursive: true });
  copied++;
}

if (skipped.length > 0) {
  // A warning rather than a failure here, because `check-design-system.mjs` runs next
  // and is the thing that decides whether what landed is enough to serve.
  console.warn(`Design system sync skipped ${skipped.length} missing source(s):`);
  for (const path of skipped) console.warn(`  - ${path}`);
}

console.log(`Design system synced into web/public (${copied} of ${jobs.length} copies).`);
