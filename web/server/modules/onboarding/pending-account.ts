/**
 * A credential chosen during registration, before staff approval.
 *
 * The plaintext password exists only for the duration of the request. Callers hash it
 * before opening their transaction, then this helper stores the Better Auth hash beside
 * a PENDING user. A PENDING user is refused at the auth boundary and gains no session.
 */

import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import type { Db } from "@/server/lib/db";
import type { UserRole } from "@/server/lib/permissions";

export const REGISTRATION_PASSWORD_MIN_LENGTH = 12;

export async function registrationPasswordHash(password: string): Promise<string> {
  return hashPassword(password);
}

/**
 * Create the pending principal when this is the first registration for the address.
 *
 * Existing users are intentionally left untouched. In particular, an anonymous caller
 * who knows somebody's email address must not be able to replace that person's password.
 */
export async function createPendingAccount(
  tx: Db,
  input: { email: string; name: string; role: Extract<UserRole, "STUDENT" | "PARTNER" | "REPRESENTATIVE">; passwordHash: string },
): Promise<void> {
  const existing = await tx.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) return;

  const id = randomUUID();
  await tx.user.create({
    data: {
      id,
      email: input.email,
      name: input.name,
      emailVerified: false,
      role: input.role,
      status: "PENDING",
    },
  });
  await tx.account.create({
    data: {
      userId: id,
      providerId: "credential",
      accountId: id,
      password: input.passwordHash,
    },
  });
}

/** A pending self-registered account can be promoted; every other collision is real. */
export function isPendingRegistration(
  user: { status: string; role: string; accounts: { providerId: string; password: string | null }[] },
  role: "STUDENT" | "PARTNER" | "REPRESENTATIVE",
): boolean {
  return (
    user.status === "PENDING" &&
    user.role === role &&
    user.accounts.some((account) => account.providerId === "credential" && Boolean(account.password))
  );
}
