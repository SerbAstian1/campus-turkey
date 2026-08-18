/**
 * Turn a university's logo artwork into the 88px circular-safe PNG the marquee wants.
 *
 * The marquee renders each logo at 44 CSS px with `border-radius: 50%` and
 * `object-fit: cover`. That combination is built for photographs and is hostile to logos:
 * a wide wordmark handed straight to it gets centre-cropped to an unreadable sliver. So
 * the fitting is done here, into the file, rather than by changing a component that a
 * dozen photographic frames also depend on.
 *
 *   node scripts/build-university-logos.mjs            rebuild from ../brand-sources/university-logos
 *   node scripts/build-university-logos.mjs --list     print the sources without writing
 *
 * Run this when a university supplies its real brand file: drop the SVG or PNG into
 * `brand-sources/university-logos/`, named for its output, and rebuild. Deterministic.
 *
 * **Licensing.** These are third-party trademarks. Wikimedia Commons and a university's
 * own website establish what a mark looks like; neither grants a commercial recruitment
 * site the right to display it. The route to that is the institution's press office —
 * the same route `image-manifest.mjs` records for photography — and an affiliated
 * university will normally grant a recruitment partner written permission on request.
 */

import sharp from "sharp";
import { readdirSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
/*
 * Originals live outside `assets/`, deliberately. `scripts/setup.mjs` copies the whole of
 * `assets/` into `web/public/`, so anything kept beside the outputs would be served on the
 * public web — publishing a folder of other institutions' source artwork, at several times
 * the weight of the files the page actually loads.
 */
const SRC = join(root, "brand-sources", "university-logos");
const OUT = join(root, "assets", "university-logos");

/** 44 CSS px in the marquee, at 2x so it stays crisp on a retina screen. */
const SIZE = 88;
/** A hair inside the mask, so antialiasing at the edge is not clipped. */
const INSET = 0.96;

/**
 * Lockups too wide to survive the circle whole. Each carries a self-contained emblem,
 * which is all the frame needs: the marquee prints the university's name as text
 * immediately beside the logo, so the artwork does not also have to spell it.
 *
 * `x` splits beside, `y` splits above — Marmara stacks its seal over its wordmark.
 */
const EMBLEM = {
  "akdeniz-university": "x",
  "koc-university": "x",
  "istanbul-technical-university": "x",
  "karadeniz-technical-university": "x",
  "marmara-university": "y",
};

/** Split at the widest fully-transparent gutter and keep the leading block. */
async function leadingEmblem(buf, axis) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  const along = axis === "x" ? w : h;
  const across = axis === "x" ? h : w;

  const inked = new Array(along).fill(false);
  for (let i = 0; i < along; i++) {
    for (let k = 0; k < across; k++) {
      const x = axis === "x" ? i : k;
      const y = axis === "x" ? k : i;
      if (data[(y * w + x) * c + 3] > 12) { inked[i] = true; break; }
    }
  }

  let best = null, run = null;
  for (let i = 0; i < along; i++) {
    if (!inked[i]) { run ??= { start: i, end: i }; run.end = i; }
    else if (run) {
      if (run.start > 0 && (!best || run.end - run.start > best.end - best.start)) best = run;
      run = null;
    }
  }
  if (!best || best.end - best.start < along * 0.02) return null;

  const region = axis === "x"
    ? { left: 0, top: 0, width: best.start, height: h }
    : { left: 0, top: 0, width: w, height: best.start };

  /*
   * Two pipelines, deliberately. Chaining `.extract().trim()` does not trim the extracted
   * region — sharp applies trim at a fixed earlier stage — so the crop keeps the full
   * width of the block it was cut from and the emblem ends up stranded in a transparent
   * band. Cut first, then trim the result.
   */
  const cut = await sharp(buf).extract(region).png().toBuffer();
  return sharp(cut).trim({ threshold: 10 }).png().toBuffer();
}

/**
 * Radius of the artwork's own enclosing circle, measured from its centre.
 *
 * Fitting the bounding *square* inside the mask is what leaves a circular seal floating
 * in empty space: a seal is already a circle, so its corners are transparent and it can
 * safely run to the full diameter. Measuring the ink lets round artwork fill the frame
 * while still holding wide artwork inside it.
 */
async function inkRadius(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  const cx = (w - 1) / 2, cy = (h - 1) / 2;
  let max = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * c + 3] <= 12) continue;
      const d = Math.hypot(x - cx, y - cy);
      if (d > max) max = d;
    }
  }
  return { r: max || Math.hypot(cx, cy), w, h };
}

if (!existsSync(SRC)) {
  console.error(`No source folder at ${SRC}.\nPut the original SVG/PNG artwork there, named for its output file.`);
  process.exit(1);
}

const sources = readdirSync(SRC).filter((f) => /\.(svg|png)$/i.test(f)).sort();

if (process.argv.includes("--list")) {
  for (const f of sources) console.log("  " + f);
  process.exit(0);
}

mkdirSync(OUT, { recursive: true });

for (const file of sources) {
  const slug = file.replace(/\.(svg|png)$/i, "");

  // Rasterise large first, so every later resize is a downscale and never an upscale.
  const big = await sharp(readFileSync(join(SRC, file)), { density: 512 })
    .resize({ width: 1200, height: 1200, fit: "inside" })
    .png().toBuffer();

  // Measure the logo by its ink, not by whatever export box it arrived in.
  let art = await sharp(big).trim({ threshold: 10 }).png().toBuffer();

  let note = "";
  if (EMBLEM[slug]) {
    const emblem = await leadingEmblem(art, EMBLEM[slug]);
    if (emblem) { art = emblem; note = `  (emblem, ${EMBLEM[slug]})`; }
    else note = "  (no gutter found — kept whole)";
  }

  const { r, w, h } = await inkRadius(art);
  // Clamped, because a crop whose ink sits off its own centre can otherwise scale past
  // the canvas and fail the composite.
  const scale = Math.min((SIZE / 2) * INSET / r, SIZE / w, SIZE / h);
  const fitW = Math.max(1, Math.min(SIZE, Math.round(w * scale)));
  const fitH = Math.max(1, Math.min(SIZE, Math.round(h * scale)));

  const scaled = await sharp(art).resize(fitW, fitH, { fit: "fill" }).png().toBuffer();

  await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: scaled, left: Math.round((SIZE - fitW) / 2), top: Math.round((SIZE - fitH) / 2) }])
    .png({ compressionLevel: 9 })
    .toFile(join(OUT, `${slug}.png`));

  console.log(`  ${slug.padEnd(34)}${`${fitW}x${fitH}`.padEnd(10)}in ${SIZE}x${SIZE}${note}`);
}

console.log(`\n  ${sources.length} logos written to assets/university-logos/`);
