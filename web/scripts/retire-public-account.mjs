/**
 * Retire a student, partner, or representative login by email.
 *
 * This repairs accounts whose intake row was deleted by the older staff delete action,
 * before that action also retired the login. Historical domain records remain linked to
 * a deactivated tombstone user, while the original email becomes available again.
 *
 *   npm run account:retire -- person@example.com --confirm
 */

import "./load-env.mjs";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const PUBLIC_ROLES = new Set(["STUDENT", "PARTNER", "REPRESENTATIVE"]);
const [, , rawEmail, confirmation] = process.argv;
const email = rawEmail?.trim().toLowerCase();

if (!email || !email.includes("@") || confirmation !== "--confirm") {
  console.error("Usage: npm run account:retire -- <email> --confirm");
  process.exit(1);
}

const db = new PrismaClient();

try {
  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      partner: { select: { id: true } },
      representative: { select: { id: true } },
    },
  });

  if (!user) throw new Error(`No account exists for ${email}.`);
  if (!PUBLIC_ROLES.has(user.role)) {
    throw new Error(`${email} is a protected ${user.role} account and cannot be retired by this command.`);
  }

  const retiredEmail = `deleted+${user.id}@accounts.invalid`;
  await db.$transaction(async (tx) => {
    await tx.session.deleteMany({ where: { userId: user.id } });
    await tx.account.deleteMany({ where: { userId: user.id } });

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

    await tx.auditLog.create({
      data: {
        id: randomUUID(),
        action: "account.retired_by_operator",
        entityType: "user",
        entityId: user.id,
        metadata: { role: user.role, previousStatus: user.status },
      },
    });
  });

  console.log(`Retired the ${user.role} account. ${email} can now register again.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
