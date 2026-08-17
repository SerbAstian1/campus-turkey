/**
 * The photography brief, generated from the code rather than maintained beside it.
 *
 * Every `ImagePlaceholder` in the application is a frame someone has to photograph,
 * licence or commission. A hand-written list of them is out of date the first time a
 * section is added, and the cost of that is not a stale document — it is a shoot that
 * comes back missing a picture.
 *
 *   node scripts/image-manifest.mjs            human-readable brief
 *   node scripts/image-manifest.mjs --json     for a spreadsheet or a DAM
 *
 * Delivery sizes assume a 1440px content column at 2x. They are a starting point for a
 * photographer, not a constraint on the source files — always keep the originals.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const web = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Longest edge to deliver, by aspect ratio, at 2x for a 1440px column. */
const DELIVERY = {
  "16 / 9": "2560 × 1440",
  "4 / 3": "2048 × 1536",
  "3 / 2": "2160 × 1440",
  "1 / 1": "1600 × 1600",
  "3 / 4": "1536 × 2048",
};

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (/node_modules|\.next/.test(full)) continue;
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx$/.test(entry) && !/\.test\.tsx$/.test(entry)) out.push(full);
  }
  return out;
}

/** One `<ImagePlaceholder … />` element, attributes flattened. */
const ELEMENT = /<ImagePlaceholder\b([\s\S]*?)\/>/g;

/**
 * One attribute's value, in the shapes that appear here: a plain string (`ratio="4 / 3"`),
 * a template literal (`` slot={`office-${o.city}`} ``), and — since the screens were
 * translated — a `t()` call, with or without interpolation arguments.
 *
 * The `t()` case reads the first string literal rather than the whole brace-delimited
 * value, because an interpolated label carries braces of its own: `t("{city} office,
 * 16:9", { city: o.city })` stops the plain `[^}]*` scan dead at `t("{city`, which is
 * what this brief printed for two frames until the pattern below was added.
 */
const attr = (block, name) => {
  const quoted = new RegExp(`\\b${name}=\\{?["\`]([^"\`]*)["\`]\\}?`).exec(block);
  if (quoted) return quoted[1];
  const translated = new RegExp(`\\b${name}=\\{\\s*t\\(\\s*["'\`]([^"'\`]*)["'\`]`).exec(block);
  if (translated) return translated[1];
  const braced = new RegExp(`\\b${name}=\\{([^}]*)\\}`).exec(block);
  return braced ? braced[1].trim() : null;
};

const frames = [];

for (const file of walk(join(web, "src"))) {
  const src = readFileSync(file, "utf8");
  for (const match of src.matchAll(ELEMENT)) {
    const block = match[1];
    const slot = attr(block, "slot") ?? "(dynamic)";
    const ratio = attr(block, "ratio") ?? "4 / 3";
    const label = attr(block, "label") ?? "Photography";

    frames.push({
      slot,
      screen: relative(web, file).split(sep).join("/").replace(/^src\/screens\//, ""),
      ratio,
      delivery: DELIVERY[ratio] ?? "source resolution",
      brief: label,
      // The photograph in the frame, once there is one. A frame carrying a `src` has been
      // delivered and must not appear on the shoot list: a brief that asks for pictures it
      // already holds is the same wasted shoot as one that forgets a section, paid twice.
      src: attr(block, "src"),
      // A frame whose slot is interpolated is per-record — one image per university,
      // not one image for the page. Worth calling out: it multiplies the shoot list.
      perRecord: /\$\{|\+/.test(slot),
    });
  }
}

frames.sort((a, b) => a.screen.localeCompare(b.screen) || a.slot.localeCompare(b.slot));

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ count: frames.length, frames }, null, 2));
} else {
  const outstanding = frames.filter((f) => !f.src);
  const supplied = frames.filter((f) => f.src);

  console.log(`\nPhotography brief — ${outstanding.length} frames to source, ${supplied.length} supplied\n`);
  console.log("Every frame below is a licensed image somebody must supply. Frames marked");
  console.log("(per-record) need one image *each* for the records they render — a university");
  console.log("directory of forty needs forty, not one.\n");

  let screen = "";
  for (const f of outstanding) {
    if (f.screen !== screen) {
      screen = f.screen;
      console.log(`\n  ${screen}`);
    }
    console.log(
      `     ${f.ratio.padEnd(8)} ${f.delivery.padEnd(13)} ${f.slot}${f.perRecord ? "  (per-record)" : ""}`,
    );
    if (f.brief && f.brief !== "Photography") console.log(`        ${f.brief}`);
  }

  const perRecord = outstanding.filter((f) => f.perRecord).length;
  console.log(`\n  ${outstanding.length} frames to source, of which ${perRecord} are per-record.`);

  if (supplied.length) {
    console.log("\n\nAlready supplied — do not re-shoot\n");
    console.log("The brief line is printed under the file so the two can be read against each");
    console.log("other. They are meant to describe the same picture; where they do not, either");
    console.log("the label or the photograph is in the wrong frame.");
    screen = "";
    for (const f of supplied) {
      if (f.screen !== screen) {
        screen = f.screen;
        console.log(`\n  ${screen}`);
      }
      console.log(`     ${f.ratio.padEnd(8)} ${f.slot.padEnd(14)} ${f.src}`);
      if (f.brief && f.brief !== "Photography") console.log(`        ${f.brief}`);
    }
  }

  console.log(
    `\n  Licensing: these are for a commercial recruitment site. University press offices\n` +
      `  will normally grant use to a recruitment partner on request, and that route also\n` +
      `  gets current, accurate photographs of the right buildings. Stock libraries cover\n` +
      `  generic campus life but will not have named Turkish institutions.\n`,
  );
}
