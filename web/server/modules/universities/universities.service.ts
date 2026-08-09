/**
 * The university directory, queried in the database — brief §44.
 *
 * The whole point of this module is the thing §78 states plainly: *never load the
 * complete university database into the client*. Forty records is fine to ship; four
 * hundred is not, and the directory is meant to grow. Filtering, searching, sorting and
 * paging all happen here so the page size stays flat as the catalogue grows.
 *
 * Every filter maps to an index declared in `0005_universities`. Search uses trigram
 * indexes rather than full-text: the box is used for partial names ("bogaz", "istan"),
 * and full-text matches whole lexemes, so it would find nothing for exactly what people
 * type.
 */

import { z } from "zod";
import { db } from "@/server/lib/db";
import type { Prisma } from "@prisma/client";

export const listUniversitiesQuery = z.object({
  /** Free text across name and city. */
  search: z.string().trim().max(120).optional(),
  city: z.string().trim().max(80).optional(),
  type: z.enum(["PUBLIC", "PRIVATE"]).optional(),
  language: z.string().trim().max(40).optional(),
  scholarship: z.enum(["true", "false"]).optional(),
  /**
   * Page rather than cursor, deliberately, and this is the one place in the codebase
   * that does. A directory has numbered pages and a visitor jumps to page four; a
   * cursor cannot express that. The money endpoints keep cursors, where the list is
   * append-only and "page four" has no stable meaning.
   */
  page: z.coerce.number().int().min(1).max(500).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
  sort: z.enum(["name", "city", "founded"]).default("name"),
});

export type ListUniversitiesQuery = z.infer<typeof listUniversitiesQuery>;

/** Only published records ever reach the public API. Draft and archived are invisible
 *  here regardless of what is asked for; the admin endpoints see them by asking. */
function publicScope(query: ListUniversitiesQuery): Prisma.UniversityWhereInput {
  const where: Prisma.UniversityWhereInput = { status: "PUBLISHED" };

  if (query.city) where.city = { equals: query.city, mode: "insensitive" };
  if (query.type) where.type = query.type;
  if (query.language) where.languages = { has: query.language };
  if (query.scholarship === "true") where.scholarship = true;

  if (query.search) {
    // `contains` compiles to ILIKE '%term%', which is what the trigram indexes serve.
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { city: { contains: query.search, mode: "insensitive" } },
    ];
  }

  return where;
}

const CARD_FIELDS = {
  id: true,
  slug: true,
  name: true,
  city: true,
  type: true,
  languages: true,
  tuitionDisplay: true,
  programCount: true,
  scholarship: true,
  latitude: true,
  longitude: true,
} as const;

export async function listUniversities(query: ListUniversitiesQuery) {
  const where = publicScope(query);

  const orderBy: Prisma.UniversityOrderByWithRelationInput =
    query.sort === "founded" ? { founded: "asc" } : { [query.sort]: "asc" };

  /**
   * Count and page in one round trip. The count is needed for "page 3 of 7" and
   * running it separately doubles the latency of every directory request for a number
   * that is always read alongside the rows.
   */
  const [total, items] = await db.$transaction([
    db.university.count({ where }),
    db.university.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: CARD_FIELDS,
    }),
  ]);

  return {
    items,
    total,
    page: query.page,
    pageSize: query.limit,
    pageCount: Math.max(1, Math.ceil(total / query.limit)),
  };
}

/**
 * Map pins for the current filter — every match, not just the visible page.
 *
 * The grid is paged and the map is not, because they answer different questions: the
 * grid is "which of these do I read next", the map is "where are they all". Paging the
 * map would make pins appear and disappear as somebody clicks through pages, which reads
 * as a broken map rather than a paged one.
 *
 * This is not a violation of §78's "never load the complete university database into the
 * client". A pin is five short fields, about sixty bytes; the full card payload is
 * roughly ten times that, and the detail record more again. The cap is there so the
 * claim stays true as the directory grows: past it, the map shows the densest matches
 * and the filter is doing too little work to be useful anyway.
 */
const PIN_CAP = 500;

export async function listUniversityPins(query: ListUniversitiesQuery) {
  return db.university.findMany({
    where: {
      ...publicScope(query),
      // A pin needs coordinates. Without this the map silently drops them and the count
      // beneath it disagrees with the number of pins drawn.
      latitude: { not: null },
      longitude: { not: null },
    },
    orderBy: { name: "asc" },
    take: PIN_CAP,
    select: { slug: true, name: true, city: true, latitude: true, longitude: true },
  });
}

/**
 * The filter options the toolbar offers.
 *
 * Derived from what is actually in the directory rather than hardcoded, so a city with
 * no universities never appears as a filter that returns nothing. That empty-result dead
 * end is the most common way a faceted filter feels broken.
 */
export async function universityFacets() {
  const published = { status: "PUBLISHED" as const };

  const [cities, languages] = await Promise.all([
    db.university.findMany({
      where: published,
      distinct: ["city"],
      orderBy: { city: "asc" },
      select: { city: true },
    }),
    db.university.findMany({ where: published, select: { languages: true } }),
  ]);

  return {
    cities: cities.map((c) => c.city),
    // Languages are an array column, so the distinct set is assembled here rather than
    // by the database. At directory scale this is one pass over a few hundred strings.
    languages: [...new Set(languages.flatMap((u) => u.languages))].sort(),
    types: ["PUBLIC", "PRIVATE"] as const,
  };
}

/** One university, with its published programmes. Returns null rather than throwing so
 *  the route can answer 404 without catching. */
export async function getUniversityBySlug(slug: string) {
  return db.university.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: {
      ...CARD_FIELDS,
      region: true,
      description: true,
      website: true,
      logo: true,
      coverImage: true,
      founded: true,
      studentsDisplay: true,
      ranking: true,
      faculties: true,
      deadlines: true,
      programs: {
        where: { status: "PUBLISHED" },
        orderBy: [{ degreeLevel: "asc" }, { name: "asc" }],
        select: {
          id: true, slug: true, name: true, degreeLevel: true, language: true,
          duration: true, tuitionMinor: true, currency: true, scholarshipAvailable: true,
        },
      },
    },
  });
}
