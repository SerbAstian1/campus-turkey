/**
 * GET /api/health — liveness and readiness
 *
 * Auth:  none — public by design. Uptime monitoring cannot authenticate, and the
 *        response contains nothing an attacker learns from.
 * Authz: public.
 *
 *   200  { status: "ok", environment }
 *   503  { status: "degraded", environment } — the database did not answer in 2s
 *
 * Deliberately not wrapped in `route()`: this endpoint must stay reachable when the
 * session layer, the rate limiter or the config loader is the thing that is broken.
 * An endpoint that reports health through the machinery whose health it reports is not
 * a health check.
 *
 * `SELECT 1` rather than a table read: it proves the connection pool can hand out a
 * working connection, which is what fails, without depending on any row existing.
 */

import { NextResponse } from "next/server";
import { db } from "@/server/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIMEOUT_MS = 2_000;

export async function GET(): Promise<NextResponse> {
  const checked = await Promise.race([
    db
      .$queryRaw`SELECT 1`
      .then(() => true)
      .catch(() => false),
    // Without this the check inherits the platform's request timeout, and a hung
    // database turns the health endpoint itself into a hang — which most monitors
    // report as "no response" rather than "unhealthy".
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), TIMEOUT_MS)),
  ]);

  return NextResponse.json(
    {
      status: checked ? "ok" : "degraded",
      environment: process.env["NODE_ENV"] ?? "unknown",
      // No version, no commit sha, no dependency list. A health endpoint that
      // enumerates the stack is free reconnaissance.
    },
    {
      status: checked ? 200 : 503,
      headers: { "cache-control": "no-store" },
    },
  );
}
