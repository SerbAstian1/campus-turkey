/**
 * Seed the message catalogues from the prototype's phrase book.
 *
 * `public/site/i18n.js` holds hand-checked translations for Arabic, French, Turkish,
 * Russian and Swahili — the nav, the calls to action, the hero, the error screens. That
 * work was reviewed by someone; machine-translating over the top of it would be a
 * downgrade, so it is imported first and the translation pass skips anything already
 * present.
 *
 *   node scripts/seed-messages.mjs
 *
 * Writes src/i18n/messages/<locale>.json, keyed by the English string.
 */

import "./load-env.mjs";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const source = readFileSync(join(root, "public/site/i18n.js"), "utf8");
const outDir = join(root, "src/i18n/messages");
mkdirSync(outDir, { recursive: true });

/** Read one `XX: { "key": "value", ... }` block out of the KEYS map. */
function readBlock(code) {
  const start = source.indexOf(`${code}: {`);
  if (start === -1) return null;

  const end = source.indexOf("\n    },", start);
  const block = source.slice(start, end === -1 ? undefined : end);

  const entries = {};
  for (const m of block.matchAll(/"([a-zA-Z][\w.]*)"\s*:\s*"((?:[^"\\]|\\.)*)"/g)) {
    entries[m[1]] = m[2].replace(/\\"/g, '"');
  }
  return entries;
}

const english = readBlock("EN");
if (!english) {
  console.error("Could not find the EN block in public/site/i18n.js");
  process.exit(1);
}

/**
 * The prototype's phrase book also carries a `PHRASE_LIST` of English->translation
 * pairs used by the sweep. Those are keyed by English already, which is exactly the
 * shape the catalogue wants, so they are merged in too.
 */
function readPhraseList(index) {
  const start = source.indexOf("PHRASE_LIST");
  const end = source.indexOf("];", start);
  if (start === -1 || end === -1) return {};

  const list = source.slice(start, end);
  const entries = {};

  // Rows are `p("English", "ar", "fr", "tr", "ru", "sw"),` — a helper call, not an
  // array literal, which is what the first version of this script assumed.
  for (const row of list.matchAll(/\bp\(([^)]*)\)/g)) {
    const parts = [...row[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) =>
      m[1].replace(/\\"/g, '"'),
    );
    const [english, ...translations] = parts;
    const value = translations[index];
    if (english && value) entries[english] = value;
  }
  return entries;
}

/* Column order in PHRASE_LIST, after the English one. */
const PHRASE_ORDER = { ar: 0, fr: 1, tr: 2, ru: 3, sw: 4 };

let written = 0;

for (const [locale, code] of Object.entries({
  ar: "AR", fr: "FR", tr: "TR", ru: "RU", sw: "SW",
})) {
  const translated = readBlock(code);
  const messages = {};

  // Keyed phrases: map key -> English -> translation.
  if (translated) {
    for (const [key, en] of Object.entries(english)) {
      if (key === "dir") continue;
      if (translated[key]) messages[en] = translated[key];
    }
  }

  // Sweep phrases, already keyed by English.
  Object.assign(messages, readPhraseList(PHRASE_ORDER[locale]));

  const file = join(outDir, `${locale}.json`);
  const existing = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};

  // Reviewed phrases win over whatever is already there — this file is the more
  // trustworthy source, and re-running should not degrade the catalogue.
  writeFileSync(file, JSON.stringify({ ...existing, ...messages }, null, 2) + "\n");
  console.log(`${locale}: ${Object.keys(messages).length} reviewed phrases`);
  written++;
}

console.log(`\nSeeded ${written} catalogues into src/i18n/messages/.`);
