/**
 * GET /api/universities/:slug — one university and its published programmes
 *
 * Auth:  none.
 * Authz: public. The service filters to PUBLISHED, so a draft answers 404 rather than
 *        revealing that it exists.
 *
 *   200  the university
 *   404  no published university with that slug
 *   429  rate limited
 *
 * 404 rather than 403 for a draft, deliberately. A 403 confirms the slug is real and
 * tells anyone probing that something is being prepared there.
 */

import { z } from "zod";
import { route } from "@/server/http/handler";
import { NotFoundError } from "@/server/lib/errors";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { getUniversityBySlug } from "@/server/modules/universities/universities.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Matches the slug rule in `src/content/universities.ts`: lowercase, digits, hyphens. */
const slugParam = z.string().regex(/^[a-z0-9-]+$/).max(140);

export const GET = route({
  access: { kind: "public" },
  rateLimit: RATE_LIMITS.publicRead,
  cacheControl: "public, s-maxage=300, stale-while-revalidate=3600",
  handler: async ({ params }) => {
    const parsed = slugParam.safeParse(params["slug"]);
    // A malformed slug cannot match a record, so this is a 404 rather than a validation
    // error: the caller asked for something that does not exist either way.
    if (!parsed.success) throw new NotFoundError("We could not find that university.");

    const university = await getUniversityBySlug(parsed.data);
    if (!university) throw new NotFoundError("We could not find that university.");

    return university;
  },
});
