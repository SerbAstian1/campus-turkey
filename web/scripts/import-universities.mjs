/**
 * Import universities from a reviewed file into the catalogue.
 *
 * **It takes a file, not a URL, and that is the whole design.** Scraping a directory
 * straight into a production database couples this site's catalogue to somebody else's
 * markup, imports their mistakes at their pace, and — for the source that prompted
 * this — copies content published under "all rights reserved". The safe division is:
 * whoever has the right to the data produces a file; this script gets it into Postgres
 * without damaging what is already there.
 *
 *   node scripts/import-universities.mjs data/universities.json            dry run
 *   node scripts/import-universities.mjs data/universities.json --apply
 *   node scripts/import-universities.mjs data/universities.json --apply --overwrite
 *
 * Dry run is the default, deliberately. The catalogue is public content with forty
 * curated records behind it, and an import that silently rewrites descriptions somebody
 * wrote is not recoverable from the file it was run with.
 *
 * Input: a JSON array. Only `name` is required.
 *
 *   [
 *     {
 *       "name": "Boğaziçi University",
 *       "city": "Istanbul",
 *       "type": "PUBLIC",
 *       "website": "https://bogazici.edu.tr",
 *       "description": "…",
 *       "founded": 1863,
 *       "languages": ["English"],
 *       "logo": "/assets/universities/bogazici.svg"
 *     }
 *   ]
 *
 * `logo` and `coverImage` are paths into `assets/`, not remote URLs. Hotlinking another
 * site's images is a broken page the day they reorganise and a copyright question in
 * the meantime; licensed files belong in the repository like every other asset.
 */

import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

/** Mirrors `slugify` in src/content/universities.ts — the published addresses. */
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const FIELDS = [
  "city", "region", "type", "description", "website", "logo", "coverImage",
  "founded", "languages", "tuitionDisplay", "studentsDisplay", "ranking", "faculties",
];

/** Reject early and by name, so a bad row is a message rather than a Prisma stack. */
function validate(row, index) {
  const problems = [];
  const where = `row ${index + 1}${row?.name ? ` (${row.name})` : ""}`;

  if (!row || typeof row !== "object") return [`${where}: not an object`];
  if (typeof row.name !== "string" || row.name.trim() === "") problems.push(`${where}: name is required`);
  if (row.type && !["PUBLIC", "PRIVATE"].includes(row.type)) {
    problems.push(`${where}: type must be PUBLIC or PRIVATE`);
  }
  if (row.website && !/^https?:\/\//.test(row.website)) {
    problems.push(`${where}: website must be an absolute URL`);
  }
  for (const key of ["logo", "coverImage"]) {
    if (row[key] && /^https?:\/\//.test(row[key])) {
      problems.push(`${where}: ${key} must be a local asset path, not a remote URL`);
    }
  }
  if (row.founded && (!Number.isInteger(row.founded) || row.founded < 1000)) {
    problems.push(`${where}: founded must be a four-digit year`);
  }
  for (const key of ["languages", "faculties"]) {
    if (row[key] && !Array.isArray(row[key])) problems.push(`${where}: ${key} must be an array`);
  }
  return problems;
}

const argv = process.argv.slice(2);
const file = argv.find((a) => !a.startsWith("--"));
const apply = argv.includes("--apply");
const overwrite = argv.includes("--overwrite");

if (!file) {
  console.error("usage: import-universities.mjs <file.json> [--apply] [--overwrite]");
  process.exit(1);
}

const rows = JSON.parse(readFileSync(file, "utf8"));
if (!Array.isArray(rows)) throw new Error("Expected a JSON array of universities.");

const problems = rows.flatMap(validate);
if (problems.length > 0) {
  console.error(`\nRefusing to import — ${problems.length} problem(s):\n`);
  for (const p of problems) console.error(`  ${p}`);
  console.error("\nNothing was written.\n");
  process.exit(1);
}

const db = new PrismaClient();

const planned = { create: [], update: [], unchanged: [], skipped: [] };

for (const row of rows) {
  const slug = row.slug ? String(row.slug) : slugify(row.name);
  const existing = await db.university.findUnique({ where: { slug } });

  if (!existing) {
    planned.create.push({ slug, name: row.name });
    if (apply) {
      await db.university.create({
        data: {
          slug,
          name: row.name,
          city: row.city ?? "",
          type: row.type ?? "PUBLIC",
          description: row.description ?? "",
          tuitionDisplay: row.tuitionDisplay ?? "",
          languages: row.languages ?? [],
          faculties: row.faculties ?? [],
          ...(row.region ? { region: row.region } : {}),
          ...(row.website ? { website: row.website } : {}),
          ...(row.logo ? { logo: row.logo } : {}),
          ...(row.coverImage ? { coverImage: row.coverImage } : {}),
          ...(row.founded ? { founded: row.founded } : {}),
          ...(row.studentsDisplay ? { studentsDisplay: row.studentsDisplay } : {}),
          ...(row.ranking ? { ranking: row.ranking } : {}),
          /*
           * New records land as DRAFT, never PUBLISHED.
           *
           * An import is a proposal. Publishing straight from a file would put an
           * unreviewed page on a public site with a real URL and a sitemap entry, and
           * the person who ran the script is rarely the person who signs off copy.
           */
          status: "DRAFT",
        },
      });
    }
    continue;
  }

  /*
   * Only fill gaps, unless `--overwrite` is explicit.
   *
   * The forty existing records are curated: their descriptions were written, their
   * tuition strings were checked. An importer whose default is to replace them turns
   * every run into a silent regression of that work, and nothing in the file it read
   * records what was lost.
   */
  const changes = {};
  for (const field of FIELDS) {
    const incoming = row[field];
    if (incoming === undefined || incoming === null || incoming === "") continue;
    if (Array.isArray(incoming) && incoming.length === 0) continue;

    const current = existing[field];
    const isEmpty =
      current === null || current === undefined || current === "" ||
      (Array.isArray(current) && current.length === 0);

    if (isEmpty || overwrite) {
      if (JSON.stringify(current) !== JSON.stringify(incoming)) changes[field] = incoming;
    }
  }

  if (Object.keys(changes).length === 0) {
    planned.unchanged.push({ slug, name: row.name });
    continue;
  }

  planned.update.push({ slug, name: row.name, fields: Object.keys(changes) });
  if (apply) await db.university.update({ where: { slug }, data: changes });
}

await db.$disconnect();

const verb = apply ? "" : "would ";
console.log(`\n${apply ? "Imported" : "Dry run"} — ${rows.length} row(s) read\n`);
console.log(`  ${verb}create     ${planned.create.length}   (as DRAFT, not published)`);
console.log(`  ${verb}update     ${planned.update.length}${overwrite ? "   (--overwrite: replacing existing values)" : "   (filling empty fields only)"}`);
console.log(`  unchanged    ${planned.unchanged.length}`);

for (const c of planned.create.slice(0, 10)) console.log(`     + ${c.slug}`);
if (planned.create.length > 10) console.log(`     … ${planned.create.length - 10} more`);
for (const u of planned.update.slice(0, 10)) console.log(`     ~ ${u.slug}  [${u.fields.join(", ")}]`);
if (planned.update.length > 10) console.log(`     … ${planned.update.length - 10} more`);

if (!apply) {
  console.log(`\nNothing was written. Re-run with --apply.\n`);
} else {
  console.log(
    `\nNew records are DRAFT. Publish them once reviewed — they have no page and no\n` +
      `sitemap entry until they are PUBLISHED.\n`,
  );
}
