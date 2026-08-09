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
import type { StaffDepartment, UserRole, UserStatus } from "@/server/lib/permissions";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  /** Declared role — brief §8. The authoritative answer to "what kind of user is this". */
  role: UserRole;
  /** Whether the account may act at all, independent of what it may do. */
  status: UserStatus;
  /**
   * Staff department, when there is one. Carries the money permissions, because the
   * brief has no FINANCE role and Campus Turkey has a payout system — see
   * `server/lib/permissions.ts`.
   */
  department: StaffDepartment | null;
  /**
   * **Being retired.** Superseded by `role` plus `department`; kept only while endpoints
   * still declare `access: { kind: "staff", roles: [...] }`.
   */
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

  /**
   * Role, status, department and partner in one query, read from the database rather
   * than from the session cookie.
   *
   * Better Auth caches the session in a signed cookie for five minutes. That is fine for
   * an identity, which does not change, and wrong for an authorization input, which does:
   * a user suspended or demoted mid-session would keep their old powers until the cache
   * expired. Reading here means a revocation takes effect on the next request, which is
   * what "revoked" has to mean.
   *
   * It also replaces the separate partner lookup this function used to do, so the cost is
   * one query either way.
   */
  const account = await db.user.findUnique({
    where: { id: result.user.id },
    select: {
      role: true,
      status: true,
      staffRole: true,
      staffProfile: { select: { department: true } },
      partner: { select: { id: true, org: true, currency: true, status: true } },
    },
  });

  // A valid session for a user who no longer exists. Treated as anonymous rather than
  // trusted from the cookie alone — the row is the record, the cookie is a claim about it.
  if (!account) return ANONYMOUS;

  const user: SessionUser = {
    id: result.user.id,
    email: result.user.email,
    name: result.user.name ?? null,
    role: account.role,
    status: account.status,
    department: account.staffProfile?.department ?? null,
    staffRole: account.staffRole,
  };

  return { user, partner: account.partner };
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
