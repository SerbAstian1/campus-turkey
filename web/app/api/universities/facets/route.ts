/**
 * GET /api/universities/facets — the filter options the toolbar offers
 *
 * Auth:  none.
 * Authz: public.
 *
 *   200  { cities, languages, types }
 *   429  rate limited
 *
 * Derived from what is actually in the directory rather than hardcoded, so a filter
 * never offers a city that returns nothing. That dead end is the most common way faceted
 * search feels broken.
 *
 * Cached longer than the listing because it changes only when a university is added or
 * removed, which is an admin action measured in months.
 */

import { route } from "@/server/http/handler";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { universityFacets } from "@/server/modules/universities/universities.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({
  access: { kind: "public" },
  rateLimit: RATE_LIMITS.publicRead,
  cacheControl: "public, s-maxage=3600, stale-while-revalidate=86400",
  handler: async () => universityFacets(),
});
