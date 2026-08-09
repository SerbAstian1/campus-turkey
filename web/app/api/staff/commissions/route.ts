/**
 * GET  /api/staff/commissions — every commission, filterable by partner and state
 * POST /api/staff/commissions — record one against a student
 *
 * Auth:  required (staff session)
 * Authz: GET  — SUPPORT, FINANCE, ADMIN
 *        POST — **FINANCE or ADMIN only.** Recording a commission creates a liability.
 *
 * GET
 *   200  { items, nextCursor }
 *   401 / 403 / 429  as elsewhere
 *
 * POST
 *   200  the created commission
 *   400  validation failed — non-integer amount, bad period, unknown currency
 *   403  SUPPORT attempting to create
 *   404  no such student
 *   422  the partner is closed, or the currency is not theirs
 *   429  rate limited
 *
 * **This is the endpoint that makes money withdrawable.** A partner's available balance
 * is the sum of their CONFIRMED commissions less what they have already taken; with no
 * way to record one, every balance on the site is zero forever. The client still has to
 * decide *what event* justifies confirming — that policy is theirs — but the operation
 * their policy will call now exists.
 */

import { route } from "@/server/http/handler";
import { requireUser } from "@/server/http/session";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { db } from "@/server/lib/db";
import { createCommission, listCommissions } from "@/server/modules/commissions/commissions.service";
import { commissionQueueQuery, createCommissionBody } from "@/server/modules/staff/staff.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({
  // Any staff member may read what partners have earned; only Finance may record or
  // confirm it. Same split as the payout queue.
  access: { kind: "permission", require: ["READ_ALL_WALLETS"] },
  rateLimit: RATE_LIMITS.partnerRead,
  query: commissionQueueQuery,
  handler: async ({ query }) =>
    listCommissions(
      db,
      {
        ...(query.partnerId ? { partnerId: query.partnerId } : {}),
        ...(query.state ? { state: query.state } : {}),
      },
      { limit: query.limit, ...(query.cursor ? { cursor: query.cursor } : {}) },
    ),
});

export const POST = route({
  access: { kind: "permission", require: ["CONFIRM_COMMISSIONS"] },
  rateLimit: RATE_LIMITS.partnerWrite,
  body: createCommissionBody,
  handler: async ({ body, session, log }) => {
    const user = requireUser(session);

    return createCommission(
      {
        studentId: body.studentId,
        amountMinor: body.amountMinor,
        currency: body.currency,
        basis: body.basis,
        period: body.period,
        confirmed: body.confirmed,
      },
      { id: user.id, role: user.role === "ADMIN" || user.role === "SUPER_ADMIN" ? "ADMIN" : "FINANCE" },
      log,
    );
  },
});
