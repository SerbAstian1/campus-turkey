/**
 * Fill the message catalogues by machine — once, offline, then commit the result.
 *
 *   node scripts/i18n-machine-translate.mjs              # every locale
 *   node scripts/i18n-machine-translate.mjs tr ar        # named locales only
 *   node scripts/i18n-machine-translate.mjs tr --limit 20  # a sample, for checking
 *
 * ## Why this is a script and not an endpoint
 *
 * The prototype translated at runtime: `public/site/i18n.js` swept the DOM and called
 * `translate.googleapis.com/translate_a/single?client=gtx` from the browser — keyless,
 * free, cached to localStorage, falling back to English on any failure. It worked, and
 * that fallback is why nothing ever visibly broke.
 *
 * What it could not do is keep working. `app/api/translate/route.ts` records the reason:
 * that endpoint is undocumented and unmetered, it rate-limits under real traffic, and it
 * can be withdrawn without notice. A site whose Turkish depends on an unannounced Google
 * URL staying up is a site that serves English to Türkiye on the day it does not.
 *
 * So the sweep runs here instead, once, and the output is committed. Production then
 * calls nothing at all.
 *
 * **Measured 2026-08-24:** the keyless endpoint answered 429 — Google's automated-traffic
 * page — to every request from this machine, with and without a browser user-agent. It is
 * spread across visitors' addresses when a browser calls it and concentrated on one
 * address when a script does, which is precisely the pattern it refuses. Hence the keyed
 * providers below; at this volume all of them are free.
 *
 * ## What it will not do
 *
 * **It never overwrites an existing translation.** Arabic, French, Turkish, Russian and
 * Swahili carry hand-reviewed phrases imported by `seed-messages.mjs`. Machine output
 * over reviewed work is a downgrade, so anything already present is left alone. That also
 * makes the script safe to re-run.
 *
 * **It never writes a string whose placeholders did not survive.** `t("Thank you,
 * {name}.")` is substituted at render time; a translation that drops or renames `{name}`
 * renders a sentence with a hole in it. Placeholders are masked before the round trip and
 * verified after it, and a string that fails verification keeps its English.
 *
 * **It is resumable.** Every answer is cached to disk as it arrives, so a run cut off by
 * a rate limit resumes where it stopped.
 *
 * ## What still needs a person
 *
 * Machine translation is good enough to read and not good enough to sign. The consent
 * lines, the withdrawal terms and the error copy carry commitments about money and
 * deadlines. Every key this writes is listed in `<locale>/.machine.json` so a native
 * speaker can find exactly what has not been reviewed.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const messagesDir = join(root, "src/i18n/messages");
const cacheFile = join(here, ".i18n-mt-cache.json");

/** Target locales, and the code each provider wants. Only `zh` differs from the folder. */
const TARGET = {
  ar: "ar", bn: "bn", es: "es", fa: "fa", fr: "fr", ha: "ha", hi: "hi",
  id: "id", ig: "ig", pt: "pt", ru: "ru", sw: "sw", tr: "tr", ur: "ur",
  yo: "yo", zh: "zh-CN",
};

/**
 * Strings that must survive untranslated.
 *
 * "Campus Turkey" machine-translated into Turkish becomes a description of a campus
 * rather than the name of the company.
 */
const PROTECTED = ["Campus Turkey", "Türkiye", "WhatsApp", "IELTS", "TOEFL", "YÖS", "SAT"];

/* ---- Masking ---------------------------------------------------------------------- */

const OPEN = "⟦";
const CLOSE = "⟧";

/**
 * Replace placeholders and protected terms with sentinels.
 *
 * Mathematical brackets rather than the prototype's `XQ0QX`: they are punctuation in
 * every target script, so a translator carries them through instead of transliterating
 * them as a word.
 */
function mask(text) {
  const found = [];
  let out = text;

  // Placeholders first — losing one breaks rendering rather than merely reading badly.
  out = out.replace(/\{[a-zA-Z][a-zA-Z0-9_]*\}/g, (token) => {
    found.push(token);
    return OPEN + (found.length - 1) + CLOSE;
  });

  for (const term of PROTECTED) {
    if (!out.includes(term)) continue;
    found.push(term);
    out = out.split(term).join(OPEN + (found.length - 1) + CLOSE);
  }

  return { text: out, found };
}

function unmask(text, found) {
  let out = text;
  found.forEach((original, index) => {
    // The round trip may add spacing inside or around the sentinel. Match loosely,
    // restore exactly.
    out = out.replace(new RegExp(OPEN + "\\s*" + index + "\\s*" + CLOSE, "g"), original);
  });
  return out;
}

/** The placeholders a string carries, as a comparable signature. */
function placeholders(text) {
  return (text.match(/\{[a-zA-Z][a-zA-Z0-9_]*\}/g) || []).slice().sort().join(",");
}

/* ---- Providers --------------------------------------------------------------------- */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const limited = () => Object.assign(new Error("rate limited"), { rateLimited: true });

/** DeepL wants uppercase, and regionalises two of these. */
function deeplTarget(code) {
  const special = { "zh-CN": "ZH", pt: "PT-BR" };
  return special[code] || code.toUpperCase();
}

/**
 * Translate one string with whichever provider is configured.
 *
 * Defaults to the keyless endpoint, because it needs no account and is the first thing
 * worth trying. The keyed alternatives are the fallback, and at this volume all three are
 * free: the whole catalogue is roughly 384,000 characters across sixteen locales, against
 * DeepL's 500,000 per month, Google Cloud's 500,000 and Azure's 2,000,000. One key, one
 * run, and no runtime dependency afterwards.
 *
 * `server/lib/config.ts` already names deepl, google and azure, so the same variable
 * serves this script and the runtime proxy.
 */
async function callProvider(text, code) {
  const provider = process.env["TRANSLATE_PROVIDER"] || "gtx";
  const key = process.env["TRANSLATE_API_KEY"];

  if (provider !== "gtx" && provider !== "disabled" && !key) {
    throw new Error("TRANSLATE_PROVIDER=" + provider + " needs TRANSLATE_API_KEY.");
  }

  if (provider === "deepl") {
    const endpoint = process.env["TRANSLATE_ENDPOINT"] || "https://api-free.deepl.com/v2/translate";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { authorization: "DeepL-Auth-Key " + key, "content-type": "application/json" },
      body: JSON.stringify({ text: [text], source_lang: "EN", target_lang: deeplTarget(code) }),
    });
    if (response.status === 429) throw limited();
    if (!response.ok) return null;
    const body = await response.json();
    return body && body.translations && body.translations[0] ? body.translations[0].text : null;
  }

  if (provider === "azure") {
    const endpoint = process.env["TRANSLATE_ENDPOINT"] || "https://api.cognitive.microsofttranslator.com";
    const region = process.env["TRANSLATE_REGION"];
    const headers = { "Ocp-Apim-Subscription-Key": key, "content-type": "application/json" };
    if (region) headers["Ocp-Apim-Subscription-Region"] = region;

    const response = await fetch(
      endpoint + "/translate?api-version=3.0&from=en&to=" + code,
      { method: "POST", headers, body: JSON.stringify([{ Text: text }]) },
    );
    if (response.status === 429) throw limited();
    if (!response.ok) return null;
    const body = await response.json();
    return body && body[0] && body[0].translations && body[0].translations[0]
      ? body[0].translations[0].text
      : null;
  }

  if (provider === "google") {
    const response = await fetch(
      "https://translation.googleapis.com/language/translate/v2?key=" + key,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ q: text, source: "en", target: code, format: "text" }),
      },
    );
    if (response.status === 429) throw limited();
    if (!response.ok) return null;
    const body = await response.json();
    return body && body.data && body.data.translations && body.data.translations[0]
      ? body.data.translations[0].translatedText
      : null;
  }

  // The keyless endpoint. No account, no key, and no promises.
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=" +
    code + "&dt=t&q=" + encodeURIComponent(text);
  const response = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (campus-turkey i18n build script)" },
  });
  if (response.status === 429) throw limited();
  if (!response.ok) return null;
  const body = await response.json();
  const segments = (body && body[0]) || [];
  const joined = segments.map((s) => (s && s[0]) || "").join("");
  return joined.trim() ? joined : null;
}

/**
 * One string, end to end.
 *
 * Returns null for anything unusable. A null keeps the English source, which is the same
 * fallback the prototype used and the reason it never broke a page.
 */
async function translateOne(text, code) {
  const masked = mask(text);
  const raw = await callProvider(masked.text, code);
  if (raw === null) return null;

  const restored = unmask(raw, masked.found);

  // A surviving sentinel means the round trip mangled it.
  if (new RegExp(OPEN + "\\s*\\d+\\s*" + CLOSE).test(restored)) return null;

  // The guarantee that matters: the same placeholders, or nothing.
  if (placeholders(restored) !== placeholders(text)) return null;

  return restored;
}

/* ---- Cache ------------------------------------------------------------------------- */

const cache = existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, "utf8")) : {};
let sinceFlush = 0;

function remember(locale, english, translated) {
  if (!cache[locale]) cache[locale] = {};
  cache[locale][english] = translated;
  sinceFlush += 1;
  if (sinceFlush >= 25) {
    writeFileSync(cacheFile, JSON.stringify(cache));
    sinceFlush = 0;
  }
}

/* ---- Run --------------------------------------------------------------------------- */

const args = process.argv.slice(2);
const limitAt = args.indexOf("--limit");
const limit = limitAt === -1 ? Infinity : Number(args[limitAt + 1]);
const named = args.filter((a, i) => !a.startsWith("--") && i !== limitAt + 1);
const locales = named.length ? named : Object.keys(TARGET);

for (const locale of locales) {
  if (!TARGET[locale]) {
    console.error('Unknown locale "' + locale + '". Known: ' + Object.keys(TARGET).join(", "));
    process.exit(1);
  }
}

const namespaces = readdirSync(join(messagesDir, "en"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(/\.json$/, ""));

console.log("provider: " + (process.env["TRANSLATE_PROVIDER"] || "gtx (keyless)") + "\n");

let totalWritten = 0;
let totalKept = 0;
let totalFailed = 0;

for (const locale of locales) {
  const code = TARGET[locale];
  const dir = join(messagesDir, locale);
  mkdirSync(dir, { recursive: true });

  const machineLog = [];
  let written = 0;
  let kept = 0;
  let failed = 0;
  let budget = limit;

  for (const namespace of namespaces) {
    const english = JSON.parse(readFileSync(join(messagesDir, "en", namespace + ".json"), "utf8"));
    const file = join(dir, namespace + ".json");
    const existing = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
    const merged = Object.assign({}, existing);

    for (const source of Object.keys(english)) {
      if (budget <= 0) break;

      // Reviewed work wins, always. This is what makes the script safe to re-run, and
      // safe over the five locales that already carry real phrases.
      if (existing[source] !== undefined) {
        kept += 1;
        continue;
      }

      const cached = cache[locale] ? cache[locale][source] : undefined;
      if (cached !== undefined) {
        if (cached !== null) {
          merged[source] = cached;
          machineLog.push(source);
          written += 1;
        } else {
          failed += 1;
        }
        continue;
      }

      budget -= 1;

      let result = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          result = await translateOne(source, code);
          break;
        } catch (error) {
          if (!error.rateLimited) throw error;
          // Backing off rather than hammering. A free endpoint is a courtesy, and being
          // rude to it is how it stops answering entirely.
          const wait = 2000 * attempt * attempt;
          process.stdout.write("\n  rate limited, waiting " + wait / 1000 + "s...");
          await sleep(wait);
        }
      }

      remember(locale, source, result);
      if (result) {
        merged[source] = result;
        machineLog.push(source);
        written += 1;
      } else {
        failed += 1;
      }

      await sleep(120);
      if ((written + failed) % 25 === 0) {
        process.stdout.write("\r  " + locale + ": " + written + " written, " + failed + " kept English...   ");
      }
    }

    // Only when there is something to write. An empty `{}` leaves a file in the diff and
    // makes the directory look populated to whoever checks next.
    if (Object.keys(merged).length > 0) {
      writeFileSync(file, JSON.stringify(merged, null, 2) + "\n");
    }
  }

  if (machineLog.length) {
    // Not a namespace, so the loader never imports it — `messages.ts` asks for a fixed
    // list of names. This exists for whoever reviews the output later.
    const manifest = {
      note: "Machine-translated by scripts/i18n-machine-translate.mjs. Not reviewed by a native speaker.",
      generated: new Date().toISOString().slice(0, 10),
      keys: machineLog.sort(),
    };
    writeFileSync(join(dir, ".machine.json"), JSON.stringify(manifest, null, 2) + "\n");
  }

  console.log(
    "\r" + locale.padEnd(4) + " " + String(written).padStart(4) + " written  " +
    String(kept).padStart(4) + " already reviewed  " + String(failed).padStart(3) + " kept English",
  );
  totalWritten += written;
  totalKept += kept;
  totalFailed += failed;
}

writeFileSync(cacheFile, JSON.stringify(cache));

console.log(
  "\n" + totalWritten + " written, " + totalKept + " reviewed strings preserved, " +
  totalFailed + " left as English.",
);
console.log("Machine-translated keys are listed per locale in <locale>/.machine.json.");
console.log("Run `npm run i18n:check` for the resulting coverage.");
