/**
 * GET /api/universities — the directory, filtered and paged
 *
 * Auth:  none. The directory is the public product.
 * Authz: public. Only PUBLISHED records are ever returned; the scope is applied in the
 *        service, not by the caller, so no query parameter can reach a draft.
 *
 *   200  { items, total, page, pageSize, pageCount }
 *   400  a filter value was not one of the permitted ones
 *   429  rate limited
 *
 * Cached at the edge. The directory changes when an admin edits it, which is rarely, and
 * every visitor to the same filter combination gets the same answer — so a short shared
 * cache absorbs the traffic spike that a homepage link produces without serving anything
 * stale for long.
 */

import { route } from "@/server/http/handler";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { listUniversities, listUniversitiesQuery } from "@/server/modules/universities/universities.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({
  access: { kind: "public" },
  rateLimit: RATE_LIMITS.publicRead,
  query: listUniversitiesQuery,
  cacheControl: "public, s-maxage=300, stale-while-revalidate=3600",
  handler: async ({ query }) => listUniversities(query),
});
