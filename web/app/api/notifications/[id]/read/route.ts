/**
 * PATCH /api/notifications/:id/read — mark one as read
 *
 * Auth:  required
 * Authz: READ_OWN_NOTIFICATIONS
 *
 *   200  { ok: true }
 *   400  `id` is not a uuid
 *   401  no session
 *   429  rate limited
 *
 * Answers 200 whether or not the id belonged to this account. The update is scoped by
 * `userId` in its `where` clause, so somebody else's notification is untouched — and
 * reporting 404 for it would confirm which ids exist, turning this into a way to probe
 * other people's activity.
 */

import { z } from "zod";
import { route } from "@/server/http/handler";
import { requireUser } from "@/server/http/session";
import { ValidationError } from "@/server/lib/errors";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { markRead } from "@/server/modules/notifications/notifications.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const idParam = z.string().uuid();

export const PATCH = route({
  access: { kind: "permission", require: ["READ_OWN_NOTIFICATIONS"] },
  rateLimit: RATE_LIMITS.partnerWrite,
  handler: async ({ params, session }) => {
    const user = requireUser(session);

    const parsed = idParam.safeParse(params["id"]);
    if (!parsed.success) throw new ValidationError({ id: ["That is not a valid notification."] });

    await markRead(parsed.data, user.id);
    return { ok: true };
  },
});
