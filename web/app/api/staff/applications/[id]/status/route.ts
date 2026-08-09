/**
 * POST /api/staff/applications/:id/status — move an application through the workflow
 *
 * Auth:  required (staff session)
 * Authz: UPDATE_APPLICATIONS
 *
 *   200  the updated application
 *   400  validation failed, or `id` is not a uuid
 *   401  no session
 *   403  lacks the permission, or the state machine refuses this actor
 *   404  no such application
 *   409  the transition is not allowed from the current status, or somebody moved it first
 *   429  rate limited
 *
 * The status the caller asks for is a *request*. `application.state.ts` decides whether
 * it happens, and §50 is explicit about why: without that, a caller can post ADMITTED to
 * an application nobody has reviewed.
 */

import { z } from "zod";
import { route } from "@/server/http/handler";
import { requireUser } from "@/server/http/session";
import { ValidationError } from "@/server/lib/errors";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { transitionApplication } from "@/server/modules/applications/applications.service";
import { ALL_STATUSES } from "@/server/modules/applications/application.state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const idParam = z.string().uuid();

const body = z.object({
  to: z.enum(ALL_STATUSES as [string, ...string[]]),
  note: z.string().trim().min(1).max(1000).optional(),
});

export const POST = route({
  access: { kind: "permission", require: ["UPDATE_APPLICATIONS"] },
  rateLimit: RATE_LIMITS.partnerWrite,
  body,
  handler: async ({ body, params, session, log }) => {
    const user = requireUser(session);

    const parsed = idParam.safeParse(params["id"]);
    if (!parsed.success) {
      throw new ValidationError({ id: ["That is not a valid application."] });
    }

    return transitionApplication(
      {
        applicationId: parsed.data,
        to: body.to as never,
        actor: "STAFF",
        actorUserId: user.id,
        note: body.note ?? null,
      },
      log,
    );
  },
});
