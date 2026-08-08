/**
 * GET /api/cron/purge-leads — delete leads past their retention date
 *
 * Auth:  bearer token matching CRON_SECRET
 * Authz: the token, and nothing else. This endpoint deletes personal data, so an
 *        unauthenticated version of it would be a way for anyone to destroy the
 *        business's enquiry pipeline.
 *
 *   200  { purged: n }
 *   401  missing or wrong token
 *   503  CRON_SECRET not configured
 *
 * Runs daily; the schedule is in `vercel.json`. Vercel Cron sends
 * `Authorization: Bearer <CRON_SECRET>` automatically when that variable is set.
 *
 * The deletion is hard, not soft. A retention policy satisfied by a `deletedAt` column
 * is not a retention policy, because the data is still there — and for the medical
 * queue in particular, "still there" is the thing the 90-day window exists to prevent.
 */

import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { randomUUID } from "node:crypto";
import { db } from "@/server/lib/db";
import { requestLogger } from "@/server/lib/logger";
import { purgeExpiredLeads } from "@/server/modules/leads/leads.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tokenMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = randomUUID();
  const log = requestLogger({ requestId, route: "/api/cron/purge-leads", method: "GET" });

  const secret = process.env["CRON_SECRET"];
  if (!secret) {
    // Not configured is not the same as unauthorised. 503 so an uptime check can tell
    // the difference between "nobody set this up" and "someone is probing it".
    return NextResponse.json({ error: "Cron is not configured." }, { status: 503 });
  }

  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!provided || !tokenMatches(provided, secret)) {
    log.warn("cron purge refused: bad token");
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const purged = await purgeExpiredLeads(db, log);

  // Always logged, including zero — a purge job that goes quiet is indistinguishable
  // from one that stopped running, and this is the only record that it did.
  log.audit("leads.purged", { purged });

  return NextResponse.json({ purged });
}
