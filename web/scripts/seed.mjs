/**
 * Development seed.
 *
 * Creates one partner with a signed-in-able account and enough history that the portal
 * has something to render: students across the pipeline, confirmed and pending
 * commissions, a payout method, and a couple of withdrawals.
 *
 * The numbers are chosen so the wallet is interesting rather than round — a partner
 * whose available balance is exactly the sum of everything confirmed tells you nothing
 * about whether the subtraction works.
 *
 *   node scripts/dev-db.mjs        # in one terminal
 *   npx prisma migrate deploy
 *   node scripts/seed.mjs
 *
 * Safe to re-run: everything is upserted on a stable key.
 */

import "./load-env.mjs";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

const db = new PrismaClient();

const EMAIL = "partner@campusturkey.test";
const PASSWORD = "partner-password-123";

const PARTNER_ID = "22222222-2222-2222-2222-222222222222";
const USER_ID = "11111111-1111-1111-1111-111111111111";
const METHOD_ID = "44444444-4444-4444-4444-444444444444";

const STAGES = ["ENQUIRY", "DOCUMENTS", "SUBMITTED", "OFFER", "VISA", "REGISTERED"];

const STUDENTS = [
  ["Amina Yusuf", "bogazici-university", "Boğaziçi University", "MSc Computer Engineering", "REGISTERED", 60000],
  ["Kwame Mensah", "istanbul-technical-university", "Istanbul Technical University", "BSc Civil Engineering", "REGISTERED", 55000],
  ["Fatima Al-Rashid", "middle-east-technical-university", "Middle East Technical University", "MSc Architecture", "VISA", 48000],
  ["Chidi Okonkwo", "bilkent-university", "Bilkent University", "BSc Economics", "OFFER", 42000],
  ["Aisha Bello", "koc-university", "Koç University", "MSc Business Analytics", "SUBMITTED", null],
  ["Samuel Adeyemi", "sabanci-university", "Sabancı University", "BSc Data Science", "DOCUMENTS", null],
  ["Zainab Ibrahim", "hacettepe-university", "Hacettepe University", "MD Medicine", "ENQUIRY", null],
];

async function main() {
  // ---- account
  await db.user.upsert({
    where: { id: USER_ID },
    update: { role: "PARTNER" },
    create: { id: USER_ID, email: EMAIL, emailVerified: true, name: "Adaeze Okafor", role: "PARTNER" },
  });

  // Better Auth owns the hashing scheme; using its own helper is what keeps this seed
  // valid when the library changes its parameters.
  const passwordHash = await hashPassword(PASSWORD);

  await db.account.upsert({
    where: { providerId_accountId: { providerId: "credential", accountId: USER_ID } },
    update: { password: passwordHash },
    create: {
      userId: USER_ID,
      providerId: "credential",
      accountId: USER_ID,
      password: passwordHash,
    },
  });

  // ---- partner
  await db.partner.upsert({
    where: { id: PARTNER_ID },
    update: {},
    create: {
      id: PARTNER_ID,
      userId: USER_ID,
      org: "Bright Futures Education",
      person: "Adaeze Okafor",
      role: "Managing Director",
      territory: "Nigeria and Ghana",
      managerName: "Elif Demir",
      managerRole: "Partnerships Lead",
      currency: "USD",
      minimumMinor: 20000,
      status: "ACTIVE",
      since: new Date("2024-03-01"),
    },
  });

  // ---- payout method. A masked label and an opaque token, never an account number.
  await db.payoutMethod.upsert({
    where: { id: METHOD_ID },
    update: {},
    create: {
      id: METHOD_ID,
      partnerId: PARTNER_ID,
      kind: "BANK",
      label: "GTBank",
      maskedDetail: "•••• 4417",
      providerToken: "seed_token_not_a_real_credential",
      providerName: "wise",
      speed: "2–5 working days",
      fee: "From 1.2%",
      isDefault: true,
    },
  });

  // ---- students and their commissions
  await db.commission.deleteMany({ where: { partnerId: PARTNER_ID } });
  await db.student.deleteMany({ where: { partnerId: PARTNER_ID } });

  for (const [name, slug, university, program, stage, commissionMinor] of STUDENTS) {
    const student = await db.student.create({
      data: {
        partnerId: PARTNER_ID,
        name,
        universitySlug: slug,
        universityName: university,
        program,
        stage,
        // Spread the timestamps so "newest first" has something to order by.
        updatedAt: new Date(Date.now() - STAGES.indexOf(stage) * 86_400_000),
      },
    });

    if (commissionMinor === null) continue;

    // Registered students are confirmed and withdrawable; anything earlier is pending.
    const confirmed = stage === "REGISTERED";
    await db.commission.create({
      data: {
        studentId: student.id,
        partnerId: PARTNER_ID,
        amountMinor: commissionMinor,
        currency: "USD",
        state: confirmed ? "CONFIRMED" : "PENDING",
        basis: `${program} — ${university}`,
        period: "2026-03",
        confirmedAt: confirmed ? new Date() : null,
      },
    });
  }

  // ---- a withdrawal already paid, so the balance is not simply the sum of everything
  await db.withdrawal.deleteMany({ where: { partnerId: PARTNER_ID } });

  const paid = await db.withdrawal.create({
    data: {
      partnerId: PARTNER_ID,
      payoutMethodId: METHOD_ID,
      reference: "WD-2026-000001",
      amountMinor: 40000,
      currency: "USD",
      status: "PAID",
      period: "2026-02",
      basis: "1 confirmed registration",
      idempotencyKey: "seed-withdrawal-0000-0000-000000000001",
      providerRef: "seed_provider_ref_1",
    },
  });

  // The audit trail is append-only, so history is written as events, never as updates.
  for (const [from, to] of [[null, "REQUESTED"], ["REQUESTED", "APPROVED"], ["APPROVED", "PROCESSING"], ["PROCESSING", "PAID"]]) {
    await db.withdrawalEvent.create({
      data: { withdrawalId: paid.id, fromStatus: from, toStatus: to },
    });
  }

  const totals = await db.commission.groupBy({
    by: ["state"],
    where: { partnerId: PARTNER_ID },
    _sum: { amountMinor: true },
  });

  const confirmed = totals.find((t) => t.state === "CONFIRMED")?._sum.amountMinor ?? 0;
  const pending = totals.find((t) => t.state === "PENDING")?._sum.amountMinor ?? 0;

  console.log(`
Seeded.

  Sign in    ${EMAIL}
  Password   ${PASSWORD}

  Confirmed  $${(confirmed / 100).toFixed(2)}
  Pending    $${(pending / 100).toFixed(2)}
  Withdrawn  $400.00
  Available  $${((confirmed - 40000) / 100).toFixed(2)}
`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
