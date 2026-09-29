/**
 * Horizontal-overflow audit.
 *
 * Measures the thing the brief actually specifies -- `scrollWidth <= clientWidth` on
 * the document element, at each required width, on each public route -- and then, when
 * it fails, names the elements responsible instead of just reporting a number.
 *
 * Attribution is the whole point. A report that says "the study-in-turkiye page
 * overflows at 375px" tells the next person nothing. One that says
 * `div[style*=minmax(320px] right=702 width=335` tells them where to look.
 *
 * WHY ATTRIBUTION HAS TO SKIP SCROLL CONTAINERS
 * A `<div>` holding a table that genuinely needs more room is supposed to scroll
 * internally, and its cells are legitimately wider than the viewport. Counting those
 * as overflow would report every correct implementation as a defect. So the walk
 * descends past any element that scrolls or clips on the x axis, and only reports
 * elements with no scroll container between them and the body -- which is precisely
 * the set that can widen the document.
 *
 * WHY THE INSTALLED CHROME RATHER THAN A DOWNLOADED BROWSER
 * `playwright-core` rather than `playwright`, with `executablePath` pointed at the
 * Chrome already on the machine. No ~300MB Chromium download, and the audit measures
 * the engine a visitor will actually use. Set CHROME_PATH to override the location.
 *
 * WHY THERE IS A WARM-UP PASS
 * `next dev` compiles a route on its first request. Measuring route-by-route therefore
 * pays the compile cost on the first width and gets a cache hit for the rest, which is
 * fine -- but interleaving compilation with measurement makes the run take many minutes
 * and gives no signal about progress. The warm-up loads every route once up front so
 * the measurement pass is pure measurement, and prints as it goes.
 *
 *   node scripts/audit-overflow.mjs                       # all routes, all widths
 *   node scripts/audit-overflow.mjs --route=/about        # one route
 *   node scripts/audit-overflow.mjs --width=320,375       # subset of widths
 *   node scripts/audit-overflow.mjs --base=http://localhost:3000
 *   node scripts/audit-overflow.mjs --json                # machine-readable
 *
 * Exit code 1 if any route overflows at any width, 2 on an error, so it can gate a build.
 */

import { chromium } from "playwright-core";
import { readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const appDir = join(here, "..", "app");

/**
 * The widths the brief lists, in the order it lists them.
 *
 * 320 and 360 are here because they are the widths a layout is *designed* for, which
 * makes them the widths where a stray 1px of padding is immediately fatal: there is no
 * slack to absorb it. 375, 390, 412 and 430 are the devices most visitors arrive on.
 * 480 is the awkward middle -- wide enough that a two-column layout still looks
 * deliberate, narrow enough that it is one column of text. The rest are desktop
 * regression guards, because a fix for the phone case must not break the layout that
 * was already correct.
 */
const WIDTHS = [320, 360, 375, 390, 412, 430, 480, 768, 1024, 1280, 1440];

/** Sub-pixel slack. Layout engines round to 1/64px, so exact equality is too strict. */
const TOLERANCE = 0.5;

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

function args() {
  const out = {
    route: null,
    widths: WIDTHS,
    base: process.env.BASE_URL || "http://localhost:3000",
    json: false,
    quiet: false,
  };
  for (const a of process.argv.slice(2)) {
    if (a === "--json") out.json = true;
    else if (a === "--quiet") out.quiet = true;
    else if (a.startsWith("--base=")) out.base = a.slice(7);
    else if (a.startsWith("--route=")) out.route = a.slice(8);
    else if (a.startsWith("--width=")) out.widths = a.slice(8).split(",").map(Number);
  }
  return out;
}

/**
 * Static public routes, discovered from the app directory rather than a hand-kept list.
 *
 * A list in a script rots: someone adds a page, the audit keeps passing on the old set,
 * and the new page is never measured. Deriving it means a new route is audited the day
 * it exists.
 *
 * Route groups -- `(site)` and anything else in parentheses -- are transparent to the
 * URL, so they contribute no path segment. `[[...slug]]` catch-alls and `_private`
 * folders are skipped: the former is a page whose contents cannot be enumerated from
 * disk, and the latter is not part of the site at all. Only `(site)` is included, which
 * is the public marketing surface the brief scopes, and which excludes `/portal` and
 * `/staff` -- those sit behind auth and would only ever measure their login redirect.
 */
function staticRoutes() {
  const found = [];
  const walk = (dir, prefix) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const name = entry.name;
      if (name.startsWith("_")) continue;
      if (entry.isDirectory()) {
        // Locale routing is optional at the public URL: middleware serves the
        // default locale at `/about` and translated variants at `/fr/about`.
        // Treat the one top-level locale segment like a route group so the
        // default-language audit can discover the pages beneath it. Other
        // dynamic segments are populated from rendered listing links below.
        if (name.includes("[") && name !== "[locale]") continue;
        const segment = name.startsWith("(") || name === "[locale]" ? "" : name;
        walk(join(dir, name), `${prefix}/${segment}`);
      } else if (name === "page.tsx") {
        found.push(prefix || "/");
      }
    }
  };
  walk(appDir, "");
  return [...new Set(found.map((r) => r.replace(/\/+$/, "") || "/"))].sort();
}

/**
 * Runs in the page. Reports the document measurement and the offenders.
 *
 * `scrollWidth` is the brief's own metric and is the one that goes in the pass/fail
 * column. The offender list is supplementary: it explains a failure, it does not define
 * one.
 *
 * This is a real function rather than a source string. A string passed to
 * `page.evaluate` is evaluated as a bare expression and its argument is not bound to
 * the parameter, so `tolerance` arrives as `undefined` and every comparison against it
 * silently passes -- the audit would report "no offenders" for a visibly broken page.
 * Passing the function lets Playwright serialise it properly.
 */
function measureInPage(tolerance) {
  const doc = document.documentElement;
  const scrollWidth = doc.scrollWidth;
  const clientWidth = doc.clientWidth;
  const overflow = scrollWidth - clientWidth;

  // A selector for the element plus the hint a person needs: tag, classes, and the
  // inline style if there is one. Inline styles matter most here because the fixed
  // widths in this project are overwhelmingly written that way, and a class name gives
  // no clue that a value is hard-coded.
  const describe = (el) => {
    const r = el.getBoundingClientRect();
    let path = "";
    let node = el;
    for (let depth = 0; node && node.nodeType === 1 && depth < 4; depth++) {
      let part = node.tagName.toLowerCase();
      if (node.id) {
        path = "#" + node.id + (path ? " > " + path : "");
        break;
      }
      const cls =
        typeof node.className === "string"
          ? node.className.split(/\s+/).filter(Boolean).slice(0, 2).join(".")
          : "";
      if (cls) part += "." + cls;
      const parent = node.parentElement;
      if (parent) {
        const sibs = [...parent.children].filter((c) => c.tagName === node.tagName);
        if (sibs.length > 1) part += ":nth-of-type(" + (sibs.indexOf(node) + 1) + ")";
      }
      path = part + (path ? " > " + path : "");
      node = node.parentElement;
    }
    return {
      path,
      right: Math.round(r.right),
      width: Math.round(r.width),
      inline: (el.getAttribute("style") || "").slice(0, 160) || null,
    };
  };

  // Does this element scroll or clip on the x axis? Then anything inside it is its own
  // problem and cannot widen the document, so the walk does not descend.
  const clipsX = (el) => {
    const s = getComputedStyle(el);
    return /auto|scroll|hidden|clip/.test(s.overflowX);
  };

  const offenders = [];
  const internalOverflow = [];
  const walk = (el) => {
    for (const child of el.children) {
      if (clipsX(child)) continue;
      const r = child.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (r.right > clientWidth + tolerance) offenders.push(describe(child));
      if (child.scrollWidth > child.clientWidth + tolerance) {
        internalOverflow.push({
          ...describe(child),
          scrollWidth: child.scrollWidth,
          clientWidth: child.clientWidth,
        });
      }
      walk(child);
    }
  };
  walk(document.body);

  return {
    scrollWidth,
    clientWidth,
    overflow,
    offenders: offenders.slice(0, 8),
    internalOverflow: internalOverflow.slice(0, 8),
  };
}

/**
 * Dynamic routes, found by reading the links the listing pages actually render.
 *
 * Guessing slugs would audit URLs that 404 and prove nothing, and the alternative --
 * hand-maintaining a list of every university, service and article slug -- rots the
 * moment anything is published. Reading the rendered links means the audit covers what
 * exists, including whatever the CMS added most recently.
 */
async function collectDynamicSlugs(page, base) {
  const listings = ["/universities", "/services", "/resources", "/study-in-turkiye"];
  const slugs = new Set();
  for (const path of listings) {
    try {
      const res = await page.goto(base + path, { waitUntil: "domcontentloaded", timeout: 60000 });
      if (!res || res.status() >= 400) continue;
      const hrefs = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href") || ""));
      for (const href of hrefs) {
        if (/^\/(universities|services|resources|institutions)\/[a-z0-9][a-z0-9-]*$/i.test(href)) {
          slugs.add(href);
        }
      }
    } catch {
      // A listing that will not load is reported by its own audit pass; here it just
      // contributes no slugs.
    }
  }
  return [...slugs].sort();
}

async function main() {
  const opt = args();
  const executablePath = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!executablePath) {
    console.error("No Chrome or Edge found. Set CHROME_PATH to a browser executable.");
    process.exit(2);
  }

  const browser = await chromium.launch({ executablePath, headless: true });
  const context = await browser.newContext({ deviceScaleFactor: 1, reducedMotion: "reduce" });
  const page = await context.newPage();

  let routes = opt.route ? [opt.route] : staticRoutes();
  if (!opt.route) {
    process.stderr.write("collecting dynamic slugs from the listing pages...\n");
    routes = routes.concat(await collectDynamicSlugs(page, opt.base));
  }

  const results = [];
  const started = process.hrtime.bigint();

  for (const route of routes) {
    // Load once, then resize the same rendered page through the matrix. CSS media
    // queries and viewport units reflow synchronously on resize; re-requesting the
    // same route eleven times adds no coverage and makes a dev-server audit spend
    // most of its time recompiling/server-rendering rather than measuring layout.
    let loadError = null;
    try {
      await page.setViewportSize({ width: opt.widths[0], height: 900 });
      const res = await page.goto(opt.base + route, { waitUntil: "domcontentloaded", timeout: 60000 });
      if (res && res.status() >= 400) loadError = "HTTP " + res.status();
      await page.evaluate(() => (document.fonts ? document.fonts.ready : undefined)).catch(() => {});
    } catch (e) {
      loadError = String((e && e.message) || e).split("\n")[0];
    }

    for (const width of opt.widths) {
      const record = { route, width, pass: true, overflow: 0, offenders: [], error: null };
      try {
        await page.setViewportSize({ width, height: 900 });
        if (loadError) {
          record.error = loadError;
        } else {
          // Give resize observers, responsive React branches and image layout one frame
          // plus a small settling window after the viewport change.
          await page.waitForTimeout(120);
          const m = await page.evaluate(measureInPage, TOLERANCE);
          Object.assign(record, m, { pass: m.overflow <= TOLERANCE });
        }
      } catch (e) {
        record.error = String((e && e.message) || e).split("\n")[0];
      }
      results.push(record);
      if (!opt.quiet) {
        const mark = record.error ? "ERR " : record.pass ? "ok  " : "FAIL";
        process.stderr.write(`  ${mark} ${String(width).padStart(4)} ${route}\n`);
      }
    }
  }

  await browser.close();
  const ms = Number(process.hrtime.bigint() - started) / 1e6;

  const failures = results.filter((r) => !r.pass);
  const errored = results.filter((r) => r.error);
  // Declared here as well as inside the report branch, because the exit code depends on
  // it and that has to hold under --json too.
  const clipped = results.filter((r) => !r.error && r.pass && r.offenders.length > 0);

  if (opt.json) {
    console.log(JSON.stringify({ results, failures: failures.length, errored: errored.length }, null, 2));
  } else {
    // Two separate findings, because they have different causes and different fixes.
    //
    //   OVERFLOW  -- the document is wider than the viewport. The brief's criterion,
    //                 and the thing a reader can actually reach.
    //   CLIPPED   -- the document is within bounds but something is wider than the
    //                 viewport with no scroll container above it. The reader sees a
    //                 page with a piece cut off and no way to reach it. This is what
    //                 `body{overflow-x:clip}` looked like from the outside: the
    //                 scrollWidth test passed on every page while the right-hand
    //                 third of the content did not exist. Reporting only on
    //                 failure would have declared that state clean.

    console.log("");
    console.log("=== DOCUMENT OVERFLOW (the brief's criterion) ===");
    if (!failures.length) console.log("  none");
    for (const r of failures) {
      console.log(
        `  FAIL  ${String(r.width).padStart(4)}  ${r.route}  +${r.overflow}px  (scrollWidth ${r.scrollWidth} > clientWidth ${r.clientWidth})`,
      );
      for (const o of r.offenders) {
        console.log(`           ${o.path}`);
        console.log(
          `             right=${o.right} width=${o.width}` + (o.inline ? `\n             style=${o.inline}` : ""),
        );
      }
      if (!r.offenders.length) {
        for (const o of r.internalOverflow || []) {
          console.log(
            `           ${o.path}\n` +
              `             internal scrollWidth=${o.scrollWidth} clientWidth=${o.clientWidth}`,
          );
        }
      }
    }

    console.log("");
    console.log("=== CLIPPED CONTENT (within bounds, but content is cut off) ===");
    if (!clipped.length) console.log("  none");
    for (const r of clipped) {
      console.log(`  CLIP  ${String(r.width).padStart(4)}  ${r.route}  ${r.offenders.length} element(s) past the edge`);
      for (const o of r.offenders.slice(0, 3)) {
        console.log(`           ${o.path}  right=${o.right} width=${o.width}`);
      }
    }

    const ok = results.length - failures.length - errored.length;
    console.log("");
    console.log(
      `${ok}/${results.length} within bounds, ${failures.length} overflow, ${errored.length} error, ` +
        `${clipped.length} clipped  (${(ms / 1000).toFixed(1)}s)`,
    );
    for (const [label, set] of [["overflow", failures], ["clipped", clipped]]) {
      const byWidth = new Map();
      for (const f of set) byWidth.set(f.width, (byWidth.get(f.width) || 0) + 1);
      if (byWidth.size) {
        const widths = [...byWidth].sort((a, b) => a[0] - b[0]).map(([w, n]) => `${w}px(${n})`);
        console.log(`${label} by width: ` + widths.join(" "));
      }
    }
  }

  process.exit(failures.length > 0 || clipped.length > 0 ? 1 : errored.length > 0 ? 2 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
