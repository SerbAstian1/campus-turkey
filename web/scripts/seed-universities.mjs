/**
 * Move the university directory from content into the database.
 *
 *   node scripts/seed-universities.mjs
 *
 * Reads `src/content/universities.ts` directly rather than restating its 40 records, so
 * the migration cannot disagree with the source it is migrating. Every field the
 * directory and detail screens render is carried across; nothing is invented.
 *
 * **Idempotent.** Upserted on `slug`, which is the published address and the one field
 * that must not change. Re-running updates in place rather than creating duplicates, so
 * this is safe to run again after the content file is corrected.
 *
 * Programmes are *not* invented. The content records carry a `programs` count and a
 * `faculties` list, not a programme catalogue, and generating rows from a count would
 * put fabricated degree names in front of applicants. `programCount` and `faculties`
 * are stored as they are; real `Program` rows arrive when the client supplies them.
 */

import "./load-env.mjs";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const db = new PrismaClient();

/** The content module is TypeScript; Node 22 strips types on import. */
const source = pathToFileURL(resolve("src/content/universities.ts")).href;
const { universities } = await import(source);

/*
 * Campus photography lives beside the files it names, not in the content records: the
 * eleven that exist are freely licensed images whose attribution has to travel with them,
 * and `universityPhotos` is what carries both. The column stores only the path —
 * the credit line is rendered from the same map on the detail screen.
 */
const campusSource = pathToFileURL(resolve("src/content/university-photos.ts")).href;
const { universityPhotos } = await import(campusSource);

if (!Array.isArray(universities) || universities.length === 0) {
  throw new Error("No universities found in src/content/universities.ts");
}

console.log(`Read ${universities.length} universities from content.`);

let created = 0;
let updated = 0;

for (const u of universities) {
  /**
   * `description` is required in the schema and `about` is what the content calls it.
   * A university with no about text would otherwise fail the insert, so the fallback is
   * a factual sentence built from fields that are always present rather than marketing
   * copy nobody wrote.
   */
  const description =
    u.about?.trim() ||
    `${u.name} is a ${u.type.toLowerCase()} university in ${u.city}.`;

  const data = {
    name: u.name,
    city: u.city,
    type: u.type === "Private" ? "PRIVATE" : "PUBLIC",
    description,
    languages: u.languages ?? [],
    tuitionDisplay: u.tuition,
    programCount: u.programs ?? 0,
    scholarship: Boolean(u.scholarship),
    founded: u.founded ?? null,
    studentsDisplay: u.students ?? null,
    ranking: u.ranking ?? null,
    faculties: u.faculties ?? [],
    // [label, value] pairs. Stored as JSON because flattening them into two arrays
    // would lose which value belongs to which label.
    deadlines: u.deadlines ?? null,
    latitude: u.lat ?? null,
    longitude: u.lng ?? null,
    // Left alone where there is no licensed photograph, so the detail page keeps its
    // reserved frame rather than pointing at a file that does not exist.
    ...(universityPhotos[u.slug] ? { coverImage: universityPhotos[u.slug].src } : {}),
    status: "PUBLISHED",
  };

  const existing = await db.university.findUnique({
    where: { slug: u.slug },
    select: { id: true },
  });

  await db.university.upsert({
    where: { slug: u.slug },
    create: { id: randomUUID(), slug: u.slug, ...data },
    update: data,
  });

  existing ? updated++ : created++;
}

const total = await db.university.count();
const cities = await db.university.findMany({
  distinct: ["city"], select: { city: true },
});

console.log(`\n  created ${created}, updated ${updated}`);
console.log(`  ${total} universities across ${cities.length} cities in the database`);
console.log(`  0 programmes — the content carries counts and faculties, not a catalogue`);

await db.$disconnect();
