/**
 * One-time setup: the house "partner" that direct student applicants are attributed to.
 *
 * A `Student` row must name exactly one of a partner or a representative — the database
 * enforces it, because that attribution is what a commission is paid against. Someone who
 * applied directly, through the public form, has neither. Rather than loosen that rule for
 * a third case every commission and reporting query would then have to handle, direct
 * applicants are attributed to this one fixed account instead.
 *
 * It is created with no credential at all and is never meant to be signed into — nobody
 * should ever run `create-staff.mjs`-style password setup against it. If it ever is, its
 * "students" would be every direct applicant, in one partner-portal view; that is a known
 * trade of this approach, not a secret one, and the reason the email below stays an
 * internal address only Campus Turkey controls.
 *
 *   node scripts/create-house-partner.mjs
 *
 * Safe to run more than once — it does nothing if the account already exists.
 *
 * Must match `HOUSE_PARTNER_EMAIL` in
 * server/modules/onboarding/student-onboarding.service.ts. Not imported from there
 * because that file is TypeScript and this runs under plain `node`, matching every other
 * one-off script in this folder.
 */

import "./load-env.mjs";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

const HOUSE_PARTNER_EMAIL = "direct-applicants@campusturkey.org";

const db = new PrismaClient();

try {
  const existing = await db.user.findUnique({
    where: { email: HOUSE_PARTNER_EMAIL },
    select: { id: true, partner: { select: { id: true } } },
  });

  if (existing?.partner) {
    console.log(`Already set up (partner ${existing.partner.id}). Nothing to do.`);
    process.exit(0);
  }

  const id = existing?.id ?? randomUUID();

  await db.$transaction(async (tx) => {
    if (!existing) {
      await tx.user.create({
        data: {
          id,
          email: HOUSE_PARTNER_EMAIL,
          name: "Campus Turkey (direct applicants)",
          emailVerified: true,
          role: "PARTNER",
          status: "ACTIVE",
        },
      });
    }

    await tx.partner.create({
      data: {
        id: randomUUID(),
        userId: id,
        org: "Campus Turkey",
        person: "Direct applicants",
        role: "House account",
        territory: "N/A",
        managerName: "N/A",
        managerRole: "N/A",
        // Never referenced by a real commission or withdrawal, so any valid ISO code
        // works — this is just what the composite foreign key requires to exist.
        currency: "USD",
        since: new Date(),
      },
    });
  });
  // No `account` row is created — deliberately. This account has no password and no way
  // to get one through the ordinary set-password flow's OTP without controlling this
  // inbox, which only Campus Turkey does.

  console.log(`Created. User ${id}, email ${HOUSE_PARTNER_EMAIL}. No credential — this account cannot sign in.`);
} catch (error) {
  console.error(error);
  process.exit(1);
} finally {
  await db.$disconnect();
}
