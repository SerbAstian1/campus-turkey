/**
 * Fixtures for the integration suite.
 *
 * Every test builds its own partner from scratch and deletes it afterwards. Sharing a
 * fixture between tests would mean one test's withdrawal changes another's balance, and
 * the failure would appear in whichever test happened to run second — the least useful
 * possible place for it to appear.
 *
 * Deletion order matters and is not incidental: `onDelete: Restrict` on the money
 * tables means a partner cannot be removed while anything references it. That is the
 * schema working as designed — you should not be able to delete a partner who has been
 * paid — so teardown unwinds in dependency order rather than the schema being loosened
 * to make cleanup convenient.
 */

import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import type { RequestLogger } from "@/server/lib/logger";

export const db = new PrismaClient();

/**
 * A logger that satisfies `RequestLogger` and writes nothing.
 *
 * The services take a logger as a parameter rather than importing one, which is what
 * makes this possible — and is the reason the audit calls in the money path can be
 * asserted on rather than merely trusted. `captureAudit` below uses that.
 */
export function silentLogger(): RequestLogger {
  const noop = () => {};
  return {
    debug: noop, info: noop, warn: noop, error: noop, audit: noop,
  } as unknown as RequestLogger;
}

/** A logger that records the audit events it is given, for tests that assert on them. */
export function captureAudit(): { log: RequestLogger; events: string[] } {
  const events: string[] = [];
  const noop = () => {};
  const log = {
    debug: noop, info: noop, warn: noop, error: noop,
    audit: (event: string) => { events.push(event); },
  } as unknown as RequestLogger;
  return { log, events };
}

export interface PartnerFixture {
  userId: string;
  partnerId: string;
  payoutMethodId: string;
  studentId: string;
  currency: string;
}

/**
 * Build a partner with `confirmedMinor` of withdrawable balance.
 *
 * `minimumMinor` defaults to 0 so that a test choosing small round amounts is testing
 * the rule it means to test, rather than tripping the partner minimum on the way.
 */
export async function createPartner(options: {
  confirmedMinor: number;
  pendingMinor?: number;
  minimumMinor?: number;
  currency?: string;
  status?: "ACTIVE" | "SUSPENDED" | "CLOSED";
}): Promise<PartnerFixture> {
  const currency = options.currency ?? "USD";
  const tag = randomUUID().slice(0, 8);

  const user = await db.user.create({
    data: {
      id: randomUUID(),
      email: `itest-${tag}@campusturkey.invalid`,
      name: `Integration ${tag}`,
      emailVerified: true,
    },
  });

  const partner = await db.partner.create({
    data: {
      id: randomUUID(),
      userId: user.id,
      org: `Integration Org ${tag}`,
      person: "Test Person",
      role: "Director",
      territory: "Testland",
      managerName: "Test Manager",
      managerRole: "Partnerships",
      currency,
      minimumMinor: options.minimumMinor ?? 0,
      status: options.status ?? "ACTIVE",
      since: new Date("2024-01-01"),
    },
  });

  const student = await db.student.create({
    data: {
      id: randomUUID(),
      partnerId: partner.id,
      name: `Student ${tag}`,
      universitySlug: "test-university",
      universityName: "Test University",
      program: "Test Program",
      stage: "REGISTERED",
    },
  });

  if (options.confirmedMinor > 0) {
    await db.commission.create({
      data: {
        id: randomUUID(),
        studentId: student.id,
        partnerId: partner.id,
        amountMinor: options.confirmedMinor,
        currency,
        state: "CONFIRMED",
        basis: "1 confirmed registration",
        period: "2025-01",
        confirmedAt: new Date(),
      },
    });
  }

  if (options.pendingMinor && options.pendingMinor > 0) {
    await db.commission.create({
      data: {
        id: randomUUID(),
        studentId: student.id,
        partnerId: partner.id,
        amountMinor: options.pendingMinor,
        currency,
        state: "PENDING",
        basis: "1 pending registration",
        period: "2025-01",
      },
    });
  }

  const payoutMethod = await db.payoutMethod.create({
    data: {
      id: randomUUID(),
      partnerId: partner.id,
      kind: "BANK",
      label: "Test Bank",
      maskedDetail: "•••• 4242",
      providerToken: `tok_${tag}`,
      providerName: "test-provider",
      speed: "2–3 business days",
      fee: "No fee",
      isDefault: true,
    },
  });

  return {
    userId: user.id,
    partnerId: partner.id,
    payoutMethodId: payoutMethod.id,
    studentId: student.id,
    currency,
  };
}

/**
 * Unwind in dependency order — see the note at the top of this file.
 *
 * The audit-trail deletion needs the append-only trigger switched off around it, and
 * that is worth being explicit about rather than quietly working around. The trigger
 * refuses `DELETE` from **every** client including a superuser, so there is no
 * credential that makes this cleanup "just work" — which is exactly the guarantee the
 * trigger exists to provide, and the reason a payment dispute can be settled from these
 * rows. Teardown is not the application, so it is allowed to take the trigger down for
 * the length of one statement; the application has no code path that can.
 *
 * `finally` re-enables it even if the delete throws. A test run that left the trigger
 * off would leave the next run testing a database whose central integrity control is
 * silently absent.
 */
export async function destroyPartner(fixture: PartnerFixture): Promise<void> {
  try {
    await db.$executeRawUnsafe(
      'ALTER TABLE "withdrawal_event" DISABLE TRIGGER "withdrawal_event_no_delete"',
    );
    await db.withdrawalEvent.deleteMany({
      where: { withdrawal: { partnerId: fixture.partnerId } },
    });
  } finally {
    await db.$executeRawUnsafe(
      'ALTER TABLE "withdrawal_event" ENABLE TRIGGER "withdrawal_event_no_delete"',
    );
  }

  await db.withdrawal.deleteMany({ where: { partnerId: fixture.partnerId } });
  await db.commission.deleteMany({ where: { partnerId: fixture.partnerId } });
  await db.payoutMethod.deleteMany({ where: { partnerId: fixture.partnerId } });
  await db.student.deleteMany({ where: { partnerId: fixture.partnerId } });
  await db.partner.deleteMany({ where: { id: fixture.partnerId } });
  await db.user.deleteMany({ where: { id: fixture.userId } });
}
