/**
 * GET /api/staff/audit-logs — who did what — brief §48
 *
 * Auth:  required (staff session)
 * Authz: READ_AUDIT_LOGS
 *
 *   200  { items, nextCursor }
 *   401  no session
 *   403  lacks the permission
 *   429  rate limited
 *
 * Filterable by entity, so "everything that ever happened to this application" is one
 * index scan. That is the question an incident actually starts from, and a log stream
 * cannot answer it without a grep across machines.
 *
 * `metadata` was redacted on the way in and a database CHECK refuses anything carrying a
 * forbidden key, so nothing sensitive can be read out of here even by somebody entitled
 * to read the rest.
 */

import { z } from "zod";
import { route } from "@/server/http/handler";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { listAudit } from "@/server/modules/audit/audit.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const listQuery = z.object({
  entityType: z.string().trim().max(60).optional(),
  entityId: z.string().trim().max(80).optional(),
  actorUserId: z.string().uuid().optional(),
  action: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().uuid().optional(),
});

export const GET = route({
  access: { kind: "permission", require: ["READ_AUDIT_LOGS"] },
  rateLimit: RATE_LIMITS.partnerRead,
  query: listQuery,
  handler: async ({ query }) => listAudit(query),
});
