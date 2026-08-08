/**
 * Session resolution.
 *
 * Turns a request's cookie into the two things every authorization decision needs:
 * who the user is, and which partner (if any) they act as.
 *
 * The partner is loaded here rather than looked up per handler, so that a handler
 * physically cannot operate on a `partnerId` that came from the request body. Every
 * partner-scoped query in this codebase takes `session.partner.id`; none takes a
 * partner id from user input. That is the single structural decision that prevents
 * the whole class of "authenticated user reads another tenant's data" bug.
 */

import type { NextRequest } from "next/server";
import { auth } from "@/server/lib/auth";
import { db } from "@/server/lib/db";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  staffRole: "SUPPORT" | "FINANCE" | "ADMIN" | null;
}

export interface SessionPartner {
  id: string;
  org: string;
  currency: string;
  status: "ACTIVE" | "SUSPENDED" | "CLOSED";
}

export interface Session {
  user: SessionUser | null;
  partner: SessionPartner | null;
}

const ANONYMOUS: Session = { user: null, partner: null };

export async function resolveSession(request: NextRequest): Promise<Session> {
  const result = await auth.api.getSession({ headers: request.headers });
  if (!result?.user) return ANONYMOUS;

  const user: SessionUser = {
    id: result.user.id,
    email: result.user.email,
    name: result.user.name ?? null,
    staffRole: (result.user as { staffRole?: SessionUser["staffRole"] }).staffRole ?? null,
  };

  // Staff accounts have no partner record. One query, indexed on the unique `userId`.
  const partner = await db.partner.findUnique({
    where: { userId: user.id },
    select: { id: true, org: true, currency: true, status: true },
  });

  return { user, partner };
}

/**
 * Narrow a session to one that definitely has a partner.
 *
 * `route()` has already enforced this for `access: { kind: "partner" }` endpoints; this
 * exists so handlers can use `session.partner.id` without a non-null assertion, and so
 * the invariant is checked rather than asserted.
 */
export function requirePartner(session: Session): SessionPartner {
  if (!session.partner) {
    throw new Error(
      "requirePartner called on a session with no partner — the route's access rule should have prevented this",
    );
  }
  return session.partner;
}

export function requireUser(session: Session): SessionUser {
  if (!session.user) {
    throw new Error(
      "requireUser called on an anonymous session — the route's access rule should have prevented this",
    );
  }
  return session.user;
}
