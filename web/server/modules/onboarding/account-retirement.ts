/**
 * Close a public login without destroying records required for finance, admissions,
 * or audit history.
 *
 * The original email is moved off the unique `User.email` column, credentials and
 * sessions are removed, and the account is permanently deactivated. That frees the
 * address for a clean registration while relations to historical records remain valid.
 */

import type { Db } from "@/server/lib/db";
import { ConflictError, NotFoundError } from "@/server/lib/errors";

const PUBLIC_ROLES = new Set(["STUDENT", "PARTNER", "REPRESENTATIVE"]);

export function retiredAccountEmail(userId: string): string {
  return `deleted+${userId}@accounts.invalid`;
}

export function isPublicAccountRole(role: string): boolean {
  return PUBLIC_ROLES.has(role);
}

export async function retirePublicAccount(tx: Db, userId: string) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      status: true,
      partner: { select: { id: true } },
      representative: { select: { id: true } },
    },
  });
  if (!user) throw new NotFoundError("We could not find the account attached to this application.");
  if (!isPublicAccountRole(user.role)) {
    throw new ConflictError(
      "protected_account",
      "Staff and administrator accounts cannot be deleted from an application.",
    );
  }

  const retiredEmail = retiredAccountEmail(user.id);

  await tx.session.deleteMany({ where: { userId: user.id } });
  await tx.account.deleteMany({ where: { userId: user.id } });

  // Commercial profiles remain as historical owners of their records, but cannot be
  // presented as active relationships after their login has been closed.
  if (user.partner) {
    await tx.partner.update({ where: { id: user.partner.id }, data: { status: "CLOSED" } });
  }
  if (user.representative) {
    await tx.representativeProfile.update({
      where: { id: user.representative.id },
      data: { status: "CLOSED", email: retiredEmail },
    });
  }

  await tx.user.update({
    where: { id: user.id },
    data: {
      email: retiredEmail,
      emailVerified: false,
      name: "Deleted account",
      image: null,
      status: "DEACTIVATED",
    },
  });

  return { userId: user.id, role: user.role, previousStatus: user.status };
}
