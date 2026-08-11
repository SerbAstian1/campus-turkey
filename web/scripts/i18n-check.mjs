/**
 * The translation-completeness gate.
 *
 * Answers one question per locale: **could this locale be served to the public today
 * without a visitor seeing English?** Everything below exists to make that answer
 * trustworthy rather than flattering.
 *
 * The failure this guards against is specific and cheap to commit: copy `en.json`
 * into sixteen files, watch every key resolve, and ship a site that is English in
 * seventeen costumes. A checker that only compares key sets passes that with a clean
 * report. So value equality with English is a failure here, not a pass — which is why
 * `protected.ts` exists to name the strings that legitimately do not change.
 *
 *   node scripts/i18n-check.mjs           report, exit 1 if any public locale is short
 *   node scripts/i18n-check.mjs --json    machine-readable, for CI
 *   node scripts/i18n-check.mjs --locale ar
 *
 * Reads static catalogues only. It never opens a database connection — the build has
 * already been brought down once by per-page queries, and a checker that runs
 * seventeen times per page would be the same mistake wearing a different hat.
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const web = join(dirname(fileURLToPath(import.meta.url)), "..");
const MESSAGES = join(web, "src", "i18n", "messages");

/* ── the locale registry, read from the one authoritative source ─────────────── */

/**
 * Parsed out of `locales.ts` rather than duplicated.
 *
 * A checker carrying its own copy of the locale list is a checker that stops covering
 * the eighteenth language on the day it is added, silently, which is the exact class of
 * bug it was written to catch.
 */
function readRegistry() {
  const src = readFileSync(join(web, "src", "i18n", "locales.ts"), "utf8");

  const localesBlock = /export const LOCALES = \[([\s\S]*?)\] as const;/.exec(src);
  if (!localesBlock) throw new Error("Could not find LOCALES in src/i18n/locales.ts");
  const locales = [...localesBlock[1].matchAll(/"([a-z-]+)"/g)].map((m) => m[1]);

  const defaultMatch = /export const DEFAULT_LOCALE = "([a-z-]+)"/.exec(src);
  if (!defaultMatch) throw new Error("Could not find DEFAULT_LOCALE");

  const rtlBlock = /RTL_LOCALES = new Set<Locale>\(\[([^\]]*)\]\)/.exec(src);
  const rtl = rtlBlock ? [...rtlBlock[1].matchAll(/"([a-z-]+)"/g)].map((m) => m[1]) : [];

  return { locales, defaultLocale: defaultMatch[1], rtl };
}

/* ── protected content ───────────────────────────────────────────────────────── */

/**
 * The exemptions, read from `protected.ts` the same way and for the same reason.
 *
 * Only the literal list and the patterns are read. The content-derived set (university
 * and city names) needs the content modules, which are TypeScript; those strings are
 * instead recognised structurally — a value identical to English that is a single
 * capitalised proper-noun phrase is reported separately as `proper-noun?` rather than
 * counted as a failure, so a translator can confirm it rather than the gate guessing.
 */
function readProtected() {
  const data = JSON.parse(readFileSync(join(web, "src", "i18n", "protected.json"), "utf8"));
  return {
    entries: new Set(data.entries.map((e) => e.value)),
    patterns: data.patterns.map((p) => new RegExp(p.source, p.flags)),
  };
}

const isProtectedValue = (value, { entries, patterns }) => {
  const t = value.trim();
  if (t === "") return false;
  if (entries.has(t)) return true;
  return patterns.some((p) => p.test(t));
};

/* ── catalogues ──────────────────────────────────────────────────────────────── */

/**
 * A locale's catalogue, merged across namespaces.
 *
 * Supports both shapes the repository has carried: a flat `<locale>.json` and a
 * `<locale>/<namespace>.json` directory. Namespace files are merged, and a key defined
 * twice is reported rather than silently taking the last one — duplicate keys across
 * namespaces are how a fix gets applied to the copy that is not being read.
 */
function loadCatalogue(locale) {
  const flat = join(MESSAGES, `${locale}.json`);
  const dir = join(MESSAGES, locale);

  const namespaces = {};
  const duplicates = [];

  if (existsSync(dir)) {
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
      const ns = file.replace(/\.json$/, "");
      namespaces[ns] = JSON.parse(readFileSync(join(dir, file), "utf8"));
    }
  } else if (existsSync(flat)) {
    namespaces["(flat)"] = JSON.parse(readFileSync(flat, "utf8"));
  } else {
    return { exists: false, merged: {}, namespaces: {}, duplicates };
  }

  const merged = {};
  for (const [ns, entries] of Object.entries(namespaces)) {
    for (const [key, value] of Object.entries(entries)) {
      if (key in merged) duplicates.push({ key, namespace: ns });
      merged[key] = value;
    }
  }

  return { exists: true, merged, namespaces, duplicates };
}

/* ── validation rules ────────────────────────────────────────────────────────── */

const PLACEHOLDER = /^(\s*)(todo|tbd|fixme|xxx|lorem ipsum|\[.*needed.*\]|translate me|n\/a)\b/i;

/** `{name}` — the interpolation form `createTranslator` implements. */
const vars = (s) => new Set([...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]));

const sameSet = (a, b) => a.size === b.size && [...a].every((v) => b.has(v));

/**
 * Does this English source need translating at all?
 *
 * A key that is punctuation, a number, or a bare identifier is not prose. Counting it
 * as a required translation inflates the denominator and pushes every locale below
 * 100% for strings no translator would touch.
 */
function isTranslatable(english, protectedSet) {
  if (isProtectedValue(english, protectedSet)) return false;
  return /\p{L}/u.test(english);
}

/** A value equal to English that looks like a proper noun — flagged, not failed. */
const looksProperNoun = (s) =>
  /^[\p{Lu}][\p{L}.'-]*(\s+[\p{Lu}\p{Ll}][\p{L}.'-]*){0,4}$/u.test(s.trim()) && s.trim().length < 48;

/* ── the check ───────────────────────────────────────────────────────────────── */

function check() {
  const { locales, defaultLocale } = readRegistry();
  const protectedSet = readProtected();

  const source = loadCatalogue(defaultLocale);
  if (!source.exists) {
    console.error(
      `\nNo catalogue for the source locale "${defaultLocale}".\n` +
        `Expected src/i18n/messages/${defaultLocale}/*.json or ${defaultLocale}.json.\n` +
        `Run the extractor first: node scripts/i18n-extract.mjs\n`,
    );
    process.exit(1);
  }

  const required = Object.keys(source.merged).filter((k) => isTranslatable(k, protectedSet));
  const protectedCount = Object.keys(source.merged).length - required.length;

  const results = [];

  for (const locale of locales) {
    const cat = loadCatalogue(locale);
    const problems = { missing: [], empty: [], untranslated: [], placeholder: [], interpolation: [], properNoun: [] };

    if (locale === defaultLocale) {
      // The source is complete by definition, but it can still be malformed.
      for (const key of required) {
        const value = source.merged[key];
        if (value === null || value === undefined || String(value).trim() === "") problems.empty.push(key);
        else if (PLACEHOLDER.test(String(value))) problems.placeholder.push(key);
        else if (!sameSet(vars(key), vars(value))) problems.interpolation.push(key);
      }
    } else {
      for (const key of required) {
        if (!(key in cat.merged)) { problems.missing.push(key); continue; }

        const value = cat.merged[key];
        if (value === null || value === undefined) { problems.empty.push(key); continue; }

        const text = String(value);
        if (text.trim() === "") { problems.empty.push(key); continue; }
        if (PLACEHOLDER.test(text)) { problems.placeholder.push(key); continue; }

        // The load-bearing rule: identical to English is not a translation.
        if (text.trim() === key.trim()) {
          (looksProperNoun(text) ? problems.properNoun : problems.untranslated).push(key);
          continue;
        }

        if (!sameSet(vars(key), vars(text))) problems.interpolation.push(key);
      }
    }

    const invalid =
      problems.empty.length + problems.untranslated.length +
      problems.placeholder.length + problems.interpolation.length;

    const good = required.length - problems.missing.length - invalid;
    const coverage = required.length === 0 ? 100 : (good / required.length) * 100;

    results.push({
      locale,
      exists: cat.exists,
      required: required.length,
      translated: good,
      missing: problems.missing.length,
      invalid,
      coverage,
      duplicates: cat.duplicates,
      problems,
    });
  }

  return { results, required: required.length, protectedCount, defaultLocale };
}

/* ── output ──────────────────────────────────────────────────────────────────── */

const argv = process.argv.slice(2);
const asJson = argv.includes("--json");
const only = argv.includes("--locale") ? argv[argv.indexOf("--locale") + 1] : null;
const verbose = argv.includes("--verbose");

const { results, required, protectedCount, defaultLocale } = check();
const shown = only ? results.filter((r) => r.locale === only) : results;

const failing = shown.filter((r) => r.coverage < 100);

if (asJson) {
  console.log(JSON.stringify({ required, protectedCount, defaultLocale, locales: shown }, null, 2));
} else {
  console.log(`\nTranslation completeness — ${required} translatable strings, ${protectedCount} protected\n`);
  console.log("Locale   Coverage   Translated   Missing   Invalid");
  console.log("-".repeat(52));
  for (const r of shown) {
    const pct = `${r.coverage.toFixed(1)}%`;
    console.log(
      r.locale.padEnd(9) +
        pct.padStart(8) +
        String(r.translated).padStart(13) +
        String(r.missing).padStart(10) +
        String(r.invalid).padStart(10) +
        (r.exists ? "" : "   (no catalogue)"),
    );
  }
  console.log("-".repeat(52));

  if (verbose) {
    for (const r of shown) {
      const kinds = Object.entries(r.problems).filter(([, v]) => v.length > 0);
      if (kinds.length === 0) continue;
      console.log(`\n${r.locale}:`);
      for (const [kind, keys] of kinds) {
        console.log(`  ${kind} (${keys.length}):`);
        for (const k of keys.slice(0, 8)) console.log(`     ${JSON.stringify(k).slice(0, 96)}`);
        if (keys.length > 8) console.log(`     … ${keys.length - 8} more`);
      }
    }
  }

  for (const r of shown) {
    for (const d of r.duplicates) {
      console.log(`\n  duplicate key in ${r.locale}/${d.namespace}: ${JSON.stringify(d.key).slice(0, 80)}`);
    }
  }

  if (failing.length > 0) {
    console.log(
      `\nFAIL — ${failing.length} of ${shown.length} locales below 100%: ${failing.map((r) => r.locale).join(", ")}`,
    );
    console.log("Run with --verbose to list the offending keys.\n");
  } else {
    console.log("\nPASS — every locale at 100%.\n");
  }
}

/*
 * The staff console is out of scope by decision, and its strings must never reach this
 * gate. That is enforced at extraction — `i18n-extract.mjs` skips `screens/staff/` — so
 * no exemption is needed here. Stated because "why does the gate not mention staff" is
 * the first question a reader will have.
 */
process.exit(failing.length > 0 ? 1 : 0);
