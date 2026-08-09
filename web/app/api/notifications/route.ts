/**
 * GET   /api/notifications — this account's notifications
 * PATCH /api/notifications — mark them all read
 *
 * Auth:  required
 * Authz: READ_OWN_NOTIFICATIONS
 *
 *   200  { items, nextCursor, unread } | { marked }
 *   401  no session
 *   429  rate limited
 *
 * One endpoint for every role. A notification belongs to a user, not to a portal, and the
 * scope is `session.user.id` — there is no parameter here that could name somebody else's.
 * That is why this needs no per-role variant, unlike the application lists.
 */

import { z } from "zod";
import { route } from "@/server/http/handler";
import { requireUser } from "@/server/http/session";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import {
  listNotifications, markAllRead, unreadCount,
} from "@/server/modules/notifications/notifications.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const listQuery = z.object({
  unreadOnly: z.enum(["true", "false"]).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().uuid().optional(),
});

export const GET = route({
  access: { kind: "permission", require: ["READ_OWN_NOTIFICATIONS"] },
  rateLimit: RATE_LIMITS.partnerRead,
  query: listQuery,
  handler: async ({ query, session }) => {
    const user = requireUser(session);

    // The badge count comes back with the list rather than from a second endpoint: every
    // caller of this needs both, and two requests to render one bell is one too many.
    const [page, unread] = await Promise.all([
      listNotifications({
        userId: user.id,
        unreadOnly: query.unreadOnly === "true",
        limit: query.limit,
        ...(query.cursor ? { cursor: query.cursor } : {}),
      }),
      unreadCount(user.id),
    ]);

    return { ...page, unread };
  },
});

export const PATCH = route({
  access: { kind: "permission", require: ["READ_OWN_NOTIFICATIONS"] },
  rateLimit: RATE_LIMITS.partnerWrite,
  handler: async ({ session }) => {
    const user = requireUser(session);
    return { marked: await markAllRead(user.id) };
  },
});
