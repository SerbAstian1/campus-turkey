/**
 * Pull every translatable string out of the application.
 *
 * Two jobs, and the second is the one that keeps the system honest:
 *
 *   1. Collect every `t("…")` call into the English catalogue, so translators receive
 *      one authoritative list rather than a diff of the codebase.
 *   2. Report public-facing strings that are **not** wrapped — the ones bypassing i18n
 *      entirely. A completeness gate over the catalogue cannot see those: a string that
 *      was never extracted is 100% covered and 0% translated, which is the most
 *      flattering possible way to be wrong.
 *
 *   node scripts/i18n-extract.mjs            report only
 *   node scripts/i18n-extract.mjs --write    update src/i18n/messages/en/*.json
 *   node scripts/i18n-extract.mjs --strict   exit 1 if any unwrapped string is found
 *
 * The staff console is skipped by decision — internal tooling stays English-only, and
 * its strings must not be able to fail the public gate.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const web = join(dirname(fileURLToPath(import.meta.url)), "..");
const EN_DIR = join(web, "src", "i18n", "messages", "en");

/** Public surfaces only. `screens/staff/` is deliberately absent — see the header. */
const ROOTS = [
  join(web, "src", "screens"),
  join(web, "src", "app"),
  join(web, "src", "components"),
  join(web, "src", "features"),
  join(web, "src", "content"),
  join(web, "app"),
];

const SKIP_DIR = /[\\/](staff|node_modules|\.next|test|__tests__)[\\/]/;
const SKIP_FILE = /\.(test|spec)\.[jt]sx?$/;

/**
 * Which namespace a file's strings belong to.
 *
 * Split by who translates it and when, not by module graph: a translator working on
 * the forms pack should not need the marketing copy in front of them.
 */
function namespaceFor(file) {
  const p = relative(web, file).split(sep).join("/");
  if (/\/(Apply|Contact|PartnerForm|RepresentativeForm|SetPassword|PartnerLogin)\.tsx$/.test(p)) return "forms";
  if (/\/(Portal|StudentPortal|RepresentativePortal)\.tsx$/.test(p)) return "portal";
  if (/\/Errors\.tsx$/.test(p) || /error\.tsx$/.test(p)) return "errors";
  if (p.startsWith("app/")) return "seo";
  if (p.includes("/app/") || p.includes("/components/")) return "common";
  if (p.includes("/content/")) return "content";
  return "site";
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (SKIP_DIR.test(full + sep)) continue;
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx|ts)$/.test(entry) && !SKIP_FILE.test(entry)) out.push(full);
  }
  return out;
}

/* ── extraction ──────────────────────────────────────────────────────────────── */

/** `t("…")` and `t('…')`, not `submit(`, `format(`, `at(`. */
const T_CALL = /(?<![A-Za-z0-9_$.])t\(\s*(["'])((?:(?!\1)[^\\]|\\.)*)\1/g;

/** JSX text: >Some words< */
const JSX_TEXT = />([^<>{}\n][^<>{}]{2,})</g;

/** Displayed string props. */
const DISPLAY_PROP =
  /\b(label|placeholder|title|aria-label|alt|description|eyebrow|badge|heading|subtitle|cta|note|hint|error|message|summary|caption)\s*=\s*"([^"]{3,})"/g;

function isProse(s) {
  const t = s.trim();
  if (t.length < 3) return false;
  if (!/\p{L}/u.test(t)) return false;
  if (/^[a-z0-9-]+$/.test(t)) return false;
  if (/^(var|calc|rgba?|https?|#|\/|\.|\$)/.test(t)) return false;
  if (/[{};]/.test(t)) return false;
  if (/^[A-Z_]+$/.test(t)) return false;
  if (/^\d+(\.\d+)?(px|rem|em|%|s|ms)?$/.test(t)) return false;
  return /\s/.test(t) || /^\p{Lu}/u.test(t);
}

const extracted = new Map(); // key -> namespace
const unwrapped = [];        // { file, value }

for (const root of ROOTS) {
  for (const file of walk(root)) {
    const src = readFileSync(file, "utf8");
    const ns = namespaceFor(file);

    for (const m of src.matchAll(T_CALL)) {
      const key = m[2].replace(/\\"/g, '"').replace(/\\'/g, "'");
      if (!extracted.has(key)) extracted.set(key, ns);
    }

    // Only .tsx carries rendered markup; .ts content files are reported separately.
    if (!file.endsWith(".tsx")) continue;

    const wrapped = new Set([...src.matchAll(T_CALL)].map((m) => m[2]));
    for (const m of [...src.matchAll(JSX_TEXT)].map((x) => x[1]).concat(
      [...src.matchAll(DISPLAY_PROP)].map((x) => x[2]),
    )) {
      const value = m.trim();
      if (!isProse(value) || wrapped.has(value)) continue;
      unwrapped.push({ file: relative(web, file).split(sep).join("/"), value });
    }
  }
}

/* ── output ──────────────────────────────────────────────────────────────────── */

const argv = process.argv.slice(2);
const write = argv.includes("--write");
const strict = argv.includes("--strict");

const byNamespace = {};
for (const [key, ns] of extracted) (byNamespace[ns] ??= {})[key] = key;

console.log(`\nExtracted ${extracted.size} translatable strings across ${Object.keys(byNamespace).length} namespaces:`);
for (const [ns, entries] of Object.entries(byNamespace).sort()) {
  console.log(`   ${ns.padEnd(10)} ${Object.keys(entries).length}`);
}

if (write) {
  mkdirSync(EN_DIR, { recursive: true });

  /*
   * Merged with what is already there, never overwritten.
   *
   * The English catalogue is not purely a function of the current call sites. It also
   * holds keys whose call site has moved or gone but whose *translations still exist*
   * in sixteen other locales — 89 such keys were recovered during the namespace
   * migration and are the only finished translation work in the repository. A plain
   * overwrite would delete them from the source of record, the gate would stop
   * requiring them, and the translations would be orphaned and then dropped as unused.
   *
   * Removing a genuinely dead key is therefore deliberate: delete it from `en/` by hand,
   * and the gate stops asking every locale for it on the next run.
   */
  for (const [ns, entries] of Object.entries(byNamespace)) {
    const target = join(EN_DIR, `${ns}.json`);
    const existing = existsSync(target) ? JSON.parse(readFileSync(target, "utf8")) : {};

    const merged = { ...existing };
    for (const key of Object.keys(entries)) merged[key] = key;

    const added = Object.keys(entries).filter((k) => !(k in existing)).length;
    const sorted = Object.fromEntries(Object.keys(merged).sort().map((k) => [k, merged[k]]));
    writeFileSync(target, JSON.stringify(sorted, null, 2) + "\n", "utf8");
    console.log(
      `   ${relative(web, target).split(sep).join("/")}  ${Object.keys(sorted).length} keys (+${added})`,
    );
  }
}

const byFile = new Map();
for (const u of unwrapped) byFile.set(u.file, (byFile.get(u.file) ?? 0) + 1);

console.log(`\n${unwrapped.length} public-facing strings are NOT wrapped in t(), in ${byFile.size} files:`);
for (const [file, n] of [...byFile].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
  console.log(`   ${String(n).padStart(4)}  ${file}`);
}
if (byFile.size > 20) console.log(`   … ${byFile.size - 20} more files`);

console.log(
  `\nThese bypass the completeness gate entirely — an unextracted string cannot be\n` +
    `reported as missing, only as absent. Wrapping them is what makes the gate meaningful.\n`,
);

process.exit(strict && unwrapped.length > 0 ? 1 : 0);
