/**
 * GET /api/student/dashboard — everything this student may see about themselves
 *
 * Auth:  required (signed-in student with a profile)
 * Authz: READ_OWN_APPLICATIONS
 *
 *   200  { profile, applications }
 *   401  no session
 *   403  not a student, or no profile yet
 *   429  rate limited
 *
 * Scoped to the caller's own profile id, taken from the session. §27 confines a student
 * to their own records, and this query is what makes that structural: there is no
 * parameter here that could name somebody else's.
 *
 * Internal notes and staff conversations are absent by construction rather than by
 * filtering — they are not in the service's select at all.
 */

import { route } from "@/server/http/handler";
import { requireUser } from "@/server/http/session";
import { db } from "@/server/lib/db";
import { ForbiddenError } from "@/server/lib/errors";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { studentDashboard } from "@/server/modules/claiming/claiming.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({
  access: { kind: "permission", require: ["READ_OWN_APPLICATIONS"] },
  rateLimit: RATE_LIMITS.partnerRead,
  handler: async ({ session }) => {
    const user = requireUser(session);

    const profile = await db.studentProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    // A student role with no profile is somebody who signed up but has not claimed a
    // record. That is a real state, not an error, but there is nothing to show yet.
    if (!profile) {
      throw new ForbiddenError(
        "Claim your student record first. Your agency or representative has the code.",
      );
    }

    return studentDashboard(profile.id);
  },
});
