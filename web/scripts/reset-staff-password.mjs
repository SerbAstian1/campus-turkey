/**
 * Reset an existing staff/admin password directly from an operator terminal.
 *
 * This is deliberately not an HTTP endpoint. Possession of database credentials is the
 * authorization boundary, and the script refuses every non-staff role. The password is
 * read with terminal echo disabled, hashed by Better Auth, and never accepted as a
 * command-line argument (where it would remain in shell history and process listings).
 *
 *   npm run staff:reset-password -- apply@campusturkey.org
 */

import "./load-env.mjs";
import { randomUUID } from "node:crypto";
import { emitKeypressEvents } from "node:readline";
import { stdin, stdout } from "node:process";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

const MIN_PASSWORD = 12;
const MAX_PASSWORD = 128;
const STAFF_ROLES = new Set(["STAFF", "ADMIN", "SUPER_ADMIN"]);

const [, , rawEmail] = process.argv;
const email = rawEmail?.trim().toLowerCase();

if (!email || !email.includes("@")) {
  console.error("Usage: npm run staff:reset-password -- <staff-email>");
  process.exit(1);
}

/** Read a secret from a real terminal without echoing it or accepting it via argv. */
function readHidden(prompt) {
  if (!stdin.isTTY || !stdout.isTTY || typeof stdin.setRawMode !== "function") {
    throw new Error("Run this command in an interactive terminal so the password can be entered privately.");
  }

  stdout.write(prompt);
  emitKeypressEvents(stdin);
  stdin.setEncoding("utf8");
  stdin.resume();

  return new Promise((resolve, reject) => {
    let value = "";
    const previousRawMode = stdin.isRaw;
    stdin.setRawMode(true);

    const finish = () => {
      stdin.off("keypress", onKeypress);
      stdin.setRawMode(Boolean(previousRawMode));
      stdin.pause();
      stdout.write("\n");
    };

    const onKeypress = (text, key = {}) => {
      if (key.ctrl && key.name === "c") {
        finish();
        reject(new Error("Password reset cancelled."));
        return;
      }

      if (key.name === "return" || key.name === "enter") {
        finish();
        resolve(value);
        return;
      }

      if (key.name === "backspace") {
        value = Array.from(value).slice(0, -1).join("");
        return;
      }

      // Ignore navigation/function keys. Pasted text arrives as ordinary text and is
      // accepted, but nothing is written back to stdout.
      if (text && !key.ctrl && !key.meta && !key.name?.startsWith("arrow")) value += text;
    };

    stdin.on("keypress", onKeypress);
  });
}

function validatePassword(password) {
  if (password.length < MIN_PASSWORD) {
    return `Use at least ${MIN_PASSWORD} characters.`;
  }
  if (password.length > MAX_PASSWORD) {
    return `Use no more than ${MAX_PASSWORD} characters.`;
  }
  return null;
}

const db = new PrismaClient();

try {
  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      accounts: {
        where: { providerId: "credential" },
        take: 1,
        select: { id: true },
      },
    },
  });

  if (!user) throw new Error(`No account exists for ${email}.`);
  if (!STAFF_ROLES.has(user.role)) {
    throw new Error(`${email} is a ${user.role} account. This command is only for staff and administrators.`);
  }

  const password = await readHidden("New password: ");
  const problem = validatePassword(password);
  if (problem) throw new Error(problem);

  const confirmation = await readHidden("Confirm password: ");
  if (password !== confirmation) throw new Error("The two passwords do not match.");

  const passwordHash = await hashPassword(password);
  const credential = user.accounts[0];

  await db.$transaction(async (tx) => {
    if (credential) {
      await tx.account.update({
        where: { id: credential.id },
        data: { password: passwordHash },
      });
    } else {
      await tx.account.create({
        data: {
          id: randomUUID(),
          userId: user.id,
          providerId: "credential",
          accountId: user.id,
          password: passwordHash,
        },
      });
    }

    // A password reset is also a credential-revocation event. Any browser signed in
    // with the old password must authenticate again with the new one.
    await tx.session.deleteMany({ where: { userId: user.id } });

    await tx.auditLog.create({
      data: {
        id: randomUUID(),
        action: "staff.password_reset_by_operator",
        entityType: "user",
        entityId: user.id,
        metadata: { role: user.role },
      },
    });
  });

  console.log(`Password updated for ${user.email}. Existing sessions were signed out.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
