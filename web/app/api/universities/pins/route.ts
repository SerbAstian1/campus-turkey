/**
 * GET /api/universities/pins — map pins for the current filter
 *
 * Auth:  none.
 * Authz: public. PUBLISHED only, applied in the service.
 *
 *   200  [{ slug, name, city, latitude, longitude }]
 *   400  a filter value was not one of the permitted ones
 *   429  rate limited
 *
 * Separate from the listing because the map and the grid want different things: the grid
 * is paged, the map is not. Sharing one endpoint would mean either paging the map, so
 * pins vanish as somebody clicks through pages, or unpaging the grid, which is what §78
 * forbids.
 *
 * Accepts the same query shape as the listing so a filter change updates both with the
 * same parameters; `page` and `limit` are simply ignored here.
 */

import { route } from "@/server/http/handler";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { listUniversityPins, listUniversitiesQuery } from "@/server/modules/universities/universities.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({
  access: { kind: "public" },
  rateLimit: RATE_LIMITS.publicRead,
  query: listUniversitiesQuery,
  cacheControl: "public, s-maxage=300, stale-while-revalidate=3600",
  handler: async ({ query }) => listUniversityPins(query),
});
