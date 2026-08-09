/**
 * The one place a referrer's applications are listed.
 *
 * Shared between the partner and representative endpoints because the *query* is
 * identical — same fields, same ordering, same paging. What is not shared is the
 * **scope**: each caller passes its own `where`, built from its own session, and neither
 * endpoint can express the other's.
 *
 * That split is the point. §29 keeps the two permission namespaces apart, and a shared
 * handler that branched on role would rejoin them at exactly the place it matters. A
 * shared *query* with separate callers keeps one copy of the SELECT and two copies of
 * the authorization decision, which is the right way round.
 */

import { db } from "@/server/lib/db";
import { APPLICATION_FIELDS } from "./applications.service";
import type { Prisma } from "@prisma/client";

export interface ReferrerListOptions {
  status?: string;
  limit: number;
  cursor?: string;
}

export async function listApplicationsForReferrer(
  scope: Prisma.ApplicationWhereInput,
  options: ReferrerListOptions,
) {
  const items = await db.application.findMany({
    where: {
      ...scope,
      ...(options.status ? { status: options.status as never } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: options.limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    select: APPLICATION_FIELDS,
  });

  const hasMore = items.length > options.limit;
  const page = hasMore ? items.slice(0, options.limit) : items;

  return { items: page, nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null };
}
