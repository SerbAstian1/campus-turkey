/**
 * Create a staff account.
 *
 * Self-signup is disabled (`disableSignUp` in server/lib/auth.ts), which is correct —
 * an open registration endpoint on a system that pays money out is not a feature. The
 * consequence is that the first staff account has to be made deliberately, and this is
 * the deliberate way.
 *
 *   node scripts/create-staff.mjs finance@campusturkey.com FINANCE
 *   node scripts/create-staff.mjs boss@campusturkey.com ADMIN "Elif Demir"
 *
 * Roles:
 *   SUPPORT  read the queues; cannot move money
 *   FINANCE  approve and reject withdrawals, record and confirm commissions
 *   ADMIN    everything FINANCE can do
 *
 * The password is generated here and printed once. It is not stored anywhere by this
 * script and cannot be recovered — hand it over through a password manager, and have
 * the holder change it. Prompting for one instead would put it in a shell history.
 */

import "./load-env.mjs";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import { randomBytes, randomUUID } from "node:crypto";

const [, , email, role = "SUPPORT", name] = process.argv;

const ROLES = ["SUPPORT", "FINANCE", "ADMIN"];

if (!email || !email.includes("@")) {
  console.error("Usage: node scripts/create-staff.mjs <email> [SUPPORT|FINANCE|ADMIN] [name]");
  process.exit(1);
}

if (!ROLES.includes(role)) {
  console.error(`Role must be one of ${ROLES.join(", ")} — got "${role}".`);
  process.exit(1);
}

/** 24 bytes of base64url. Long enough that nobody is tempted to keep it. */
const password = randomBytes(24).toString("base64url");

const db = new PrismaClient();

try {
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    console.error(`${email} already has an account. Change its role in the database, or use another address.`);
    process.exit(1);
  }

  const id = randomUUID();

  await db.user.create({
    data: {
      id,
      email,
      name: name ?? null,
      // Staff are created by someone who already controls the address, and there is no
      // mail provider guaranteed to be configured. Marking it verified here is what
      // makes the account usable immediately; partners still go through verification.
      emailVerified: true,
      staffRole: role,
    },
  });

  await db.account.create({
    data: {
      userId: id,
      providerId: "credential",
      accountId: id,
      // Better Auth owns the hashing scheme; using its own helper is what keeps this
      // valid when the library changes its parameters.
      password: await hashPassword(password),
    },
  });

  console.log(`
Created ${role} account.

  Email     ${email}
  Password  ${password}

Hand this over through a password manager, never over email or chat, and have them
change it on first sign-in. It is not stored and cannot be shown again.
`);
} catch (error) {
  console.error(error);
  process.exit(1);
} finally {
  await db.$disconnect();
}
