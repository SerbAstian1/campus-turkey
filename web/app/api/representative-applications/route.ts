/**
 * POST /api/representative-applications — apply to become a representative
 *
 * Auth:  none. This is a public form, by design (§65).
 * Authz: public.
 *
 *   200  { ok: true }
 *   400  validation failed
 *   403  origin check failed
 *   429  rate limited
 *
 * Always answers `{ ok: true }` on success, regardless of whether this address has
 * applied before. A public endpoint that distinguishes "recorded" from "you already
 * applied" confirms who Campus Turkey is already talking to, which is commercially
 * sensitive quite apart from being a privacy problem.
 *
 * Approval is a separate, staff-only action. Nothing here creates an account.
 */

import { route } from "@/server/http/handler";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { submitRepresentativeApplicationBody } from "@/server/modules/representatives/representatives.schema";
import { submitRepresentativeApplication } from "@/server/modules/representatives/representatives.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route({
  access: { kind: "public" },
  rateLimit: RATE_LIMITS.leads,
  body: submitRepresentativeApplicationBody,
  handler: async ({ body, log }) => {
    await submitRepresentativeApplication(body, log);
    return { ok: true };
  },
});
