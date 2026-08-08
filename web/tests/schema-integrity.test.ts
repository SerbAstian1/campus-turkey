/**
 * The database's integrity guarantees, executed rather than asserted.
 *
 * Department 18 claims that a set of impossible states are unrepresentable. Until this
 * file existed, that claim rested entirely on reading `migration.sql` — neither
 * migration had ever been run. A CHECK constraint with a typo in its predicate is
 * indistinguishable from a correct one by inspection, and a trigger that fails to
 * install fails silently.
 *
 * PGlite is Postgres compiled to WebAssembly: real constraint checking, real triggers,
 * real composite foreign keys, no Docker and no service to start. What it cannot do is
 * open two connections, so the SERIALIZABLE concurrency behaviour is not covered here —
 * that needs a real server and is specified in docs/TESTING.md.
 *
 * Every test names the bug it prevents. A constraint whose absence breaks nothing does
 * not need to exist.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

let db: PGlite;

/** UUIDs used across the fixtures. Fixed so a failure is reproducible. */
const USER = "11111111-1111-1111-1111-111111111111";
const PARTNER = "22222222-2222-2222-2222-222222222222";
const STUDENT = "33333333-3333-3333-3333-333333333333";
const METHOD = "44444444-4444-4444-4444-444444444444";
const OTHER_PARTNER = "55555555-5555-5555-5555-555555555555";
const OTHER_USER = "66666666-6666-6666-6666-666666666666";

const migration = (name: string): string =>
  readFileSync(resolve(process.cwd(), `prisma/migrations/${name}/migration.sql`), "utf8");

/** Run SQL and return the error message, or null when it succeeded. */
async function refusal(sql: string): Promise<string | null> {
  try {
    await db.exec(sql);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

beforeAll(async () => {
  db = new PGlite();

  // The real migrations, in order, exactly as `prisma migrate deploy` would apply them.
  // This is itself the first assertion: until now, neither had ever been executed.
  await db.exec(migration("0001_init"));
  await db.exec(migration("0002_integrity_constraints"));

  // A minimal, valid world. Everything below mutates from here.
  await db.exec(`
    INSERT INTO "user" ("id","email","emailVerified","createdAt","updatedAt")
      VALUES ('${USER}','partner@example.test',true,now(),now()),
             ('${OTHER_USER}','other@example.test',true,now(),now());

    INSERT INTO "partner"
      ("id","userId","org","person","role","territory","managerName","managerRole",
       "currency","minimumMinor","status","since","createdAt","updatedAt")
      VALUES ('${PARTNER}','${USER}','Bright Futures','A Person','Director','Nigeria',
              'A Manager','Partnerships','USD',20000,'ACTIVE','2026-01-01',now(),now()),
             ('${OTHER_PARTNER}','${OTHER_USER}','Other Agency','B Person','Director','Kenya',
              'A Manager','Partnerships','USD',20000,'ACTIVE','2026-01-01',now(),now());

    INSERT INTO "student"
      ("id","partnerId","name","universitySlug","universityName","program","stage",
       "createdAt","updatedAt")
      VALUES ('${STUDENT}','${PARTNER}','A Student','bogazici','Bogazici','MSc CS',
              'ENQUIRY',now(),now());

    INSERT INTO "payout_method"
      ("id","partnerId","kind","label","maskedDetail","providerToken","providerName",
       "speed","fee","isDefault","createdAt","updatedAt")
      VALUES ('${METHOD}','${PARTNER}','BANK','GTBank','•••• 4417','tok_test','wise',
              '2-5 days','1.2%',true,now(),now());
  `);
});

afterAll(async () => {
  await db?.close();
});

describe("the migrations apply", () => {
  it("creates every domain table", async () => {
    const result = await db.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema='public' ORDER BY table_name`,
    );
    const tables = result.rows.map((r) => r.table_name);
    for (const expected of [
      "commission", "lead", "partner", "payout_method", "student",
      "user", "session", "account", "verification",
      "withdrawal", "withdrawal_event",
    ]) {
      expect(tables).toContain(expected);
    }
  });

  it("installs the reference sequence, and it never repeats a value", async () => {
    // `COUNT(*) + 1` is the classic way to mint duplicate references under
    // concurrency. The sequence is the reason `withdrawal.reference` can be unique.
    const a = await db.query<{ v: string }>(`SELECT nextval('withdrawal_reference_seq') AS v`);
    const b = await db.query<{ v: string }>(`SELECT nextval('withdrawal_reference_seq') AS v`);
    expect(a.rows[0]!.v).not.toBe(b.rows[0]!.v);
  });

  it("installs the balance-query covering indexes", async () => {
    const result = await db.query<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes WHERE schemaname='public'`,
    );
    const names = result.rows.map((r) => r.indexname);
    expect(names).toContain("commission_balance_confirmed");
    expect(names).toContain("commission_balance_pending");
    expect(names).toContain("withdrawal_balance_committed");
  });
});

describe("money cannot be negative or zero", () => {
  it("refuses a withdrawal of zero", async () => {
    // Without this, "withdraw 0" creates a payout row for nothing and a support ticket.
    const error = await refusal(`
      INSERT INTO "withdrawal" ("id","partnerId","payoutMethodId","reference","amountMinor",
        "currency","status","period","basis","idempotencyKey","requestedAt","updatedAt")
      VALUES (gen_random_uuid(),'${PARTNER}','${METHOD}','WD-0',0,'USD','REQUESTED',
              '2026-03','x',gen_random_uuid()::text,now(),now())`);
    expect(error).toMatch(/withdrawal_amount_positive/);
  });

  it("refuses a negative withdrawal, which would be a credit", async () => {
    const error = await refusal(`
      INSERT INTO "withdrawal" ("id","partnerId","payoutMethodId","reference","amountMinor",
        "currency","status","period","basis","idempotencyKey","requestedAt","updatedAt")
      VALUES (gen_random_uuid(),'${PARTNER}','${METHOD}','WD-N',-5000,'USD','REQUESTED',
              '2026-03','x',gen_random_uuid()::text,now(),now())`);
    expect(error).toMatch(/withdrawal_amount_positive/);
  });

  it("refuses a non-positive commission", async () => {
    const error = await refusal(`
      INSERT INTO "commission" ("id","studentId","partnerId","amountMinor","currency",
        "state","basis","period","createdAt","updatedAt")
      VALUES (gen_random_uuid(),'${STUDENT}','${PARTNER}',0,'USD','PENDING','x','2026-03',now(),now())`);
    expect(error).toMatch(/commission_amount_positive/);
  });
});

describe("currency cannot drift", () => {
  it("refuses a commission denominated in a currency the partner does not hold", async () => {
    // The composite foreign key. Summing mixed currencies into one balance is a money
    // bug no amount of careful application code reliably prevents.
    const error = await refusal(`
      INSERT INTO "commission" ("id","studentId","partnerId","amountMinor","currency",
        "state","basis","period","createdAt","updatedAt")
      VALUES (gen_random_uuid(),'${STUDENT}','${PARTNER}',50000,'EUR','PENDING','x','2026-03',now(),now())`);
    expect(error).toMatch(/foreign key|commission_partnerId_currency_fkey/i);
  });

  it("refuses a withdrawal in a currency the partner does not hold", async () => {
    const error = await refusal(`
      INSERT INTO "withdrawal" ("id","partnerId","payoutMethodId","reference","amountMinor",
        "currency","status","period","basis","idempotencyKey","requestedAt","updatedAt")
      VALUES (gen_random_uuid(),'${PARTNER}','${METHOD}','WD-E',50000,'EUR','REQUESTED',
              '2026-03','x',gen_random_uuid()::text,now(),now())`);
    expect(error).toMatch(/foreign key|withdrawal_partnerId_currency_fkey/i);
  });

  it("refuses a lowercase currency code", async () => {
    const error = await refusal(
      `UPDATE "partner" SET "currency"='usd' WHERE "id"='${PARTNER}'`,
    );
    expect(error).toMatch(/partner_currency_iso/);
  });
});

describe("a commission belongs to its student's partner", () => {
  it("refuses a commission whose partner is not the student's partner", async () => {
    // The denormalised `commission.partnerId` exists to keep the balance query off a
    // join. This composite foreign key is what makes it provably correct rather than
    // merely intended.
    const error = await refusal(`
      INSERT INTO "commission" ("id","studentId","partnerId","amountMinor","currency",
        "state","basis","period","createdAt","updatedAt")
      VALUES (gen_random_uuid(),'${STUDENT}','${OTHER_PARTNER}',50000,'USD','PENDING','x','2026-03',now(),now())`);
    expect(error).toMatch(/foreign key|student/i);
  });
});

describe("a confirmed commission always records when it was confirmed", () => {
  it("refuses CONFIRMED with no timestamp", async () => {
    // "When did this become withdrawable?" is the first question in any commission
    // dispute.
    const error = await refusal(`
      INSERT INTO "commission" ("id","studentId","partnerId","amountMinor","currency",
        "state","basis","period","confirmedAt","createdAt","updatedAt")
      VALUES (gen_random_uuid(),'${STUDENT}','${PARTNER}',50000,'USD','CONFIRMED','x','2026-03',NULL,now(),now())`);
    expect(error).toMatch(/commission_confirmed_at_iff_confirmed/);
  });

  it("refuses a timestamp on a commission that is not confirmed", async () => {
    const error = await refusal(`
      INSERT INTO "commission" ("id","studentId","partnerId","amountMinor","currency",
        "state","basis","period","confirmedAt","createdAt","updatedAt")
      VALUES (gen_random_uuid(),'${STUDENT}','${PARTNER}',50000,'USD','PENDING','x','2026-03',now(),now(),now())`);
    expect(error).toMatch(/commission_confirmed_at_iff_confirmed/);
  });

  it("accepts CONFIRMED with a timestamp", async () => {
    const error = await refusal(`
      INSERT INTO "commission" ("id","studentId","partnerId","amountMinor","currency",
        "state","basis","period","confirmedAt","createdAt","updatedAt")
      VALUES (gen_random_uuid(),'${STUDENT}','${PARTNER}',50000,'USD','CONFIRMED','6 registrations','2026-03',now(),now(),now())`);
    expect(error).toBeNull();
  });

  it("refuses a period of the right length but the wrong shape", async () => {
    // `2026/03` is exactly seven characters, so it clears the column type and has to be
    // caught by the CHECK. A free-form period silently splits every grouped report.
    const error = await refusal(`
      INSERT INTO "commission" ("id","studentId","partnerId","amountMinor","currency",
        "state","basis","period","createdAt","updatedAt")
      VALUES (gen_random_uuid(),'${STUDENT}','${PARTNER}',50000,'USD','PENDING','x','2026/03',now(),now())`);
    expect(error).toMatch(/commission_period_format/);
  });

  it("refuses an over-length period at the column type, before the CHECK is reached", async () => {
    // Belt and braces, and worth knowing which one fires: the error text differs, so a
    // runbook query that greps for the constraint name would miss this case.
    const error = await refusal(`
      INSERT INTO "commission" ("id","studentId","partnerId","amountMinor","currency",
        "state","basis","period","createdAt","updatedAt")
      VALUES (gen_random_uuid(),'${STUDENT}','${PARTNER}',50000,'USD','PENDING','x','March 2026',now(),now())`);
    expect(error).toMatch(/too long/i);
  });
});

describe("a payout in flight carries its provider reference", () => {
  it("refuses PROCESSING with no provider reference", async () => {
    // A PAID row with no reference cannot be reconciled against the provider's
    // statement, which is the whole point of holding it.
    const error = await refusal(`
      INSERT INTO "withdrawal" ("id","partnerId","payoutMethodId","reference","amountMinor",
        "currency","status","period","basis","idempotencyKey","requestedAt","updatedAt")
      VALUES (gen_random_uuid(),'${PARTNER}','${METHOD}','WD-P',50000,'USD','PROCESSING',
              '2026-03','x',gen_random_uuid()::text,now(),now())`);
    expect(error).toMatch(/withdrawal_provider_ref_when_moving/);
  });

  it("accepts REQUESTED without one, because money has not moved", async () => {
    const error = await refusal(`
      INSERT INTO "withdrawal" ("id","partnerId","payoutMethodId","reference","amountMinor",
        "currency","status","period","basis","idempotencyKey","requestedAt","updatedAt")
      VALUES (gen_random_uuid(),'${PARTNER}','${METHOD}','WD-R1',50000,'USD','REQUESTED',
              '2026-03','x',gen_random_uuid()::text,now(),now())`);
    expect(error).toBeNull();
  });
});

describe("the idempotency key", () => {
  const KEY = "aaaaaaaa-0000-0000-0000-000000000001";

  it("permits one withdrawal per key per partner", async () => {
    const error = await refusal(`
      INSERT INTO "withdrawal" ("id","partnerId","payoutMethodId","reference","amountMinor",
        "currency","status","period","basis","idempotencyKey","requestedAt","updatedAt")
      VALUES (gen_random_uuid(),'${PARTNER}','${METHOD}','WD-K1',50000,'USD','REQUESTED',
              '2026-03','x','${KEY}',now(),now())`);
    expect(error).toBeNull();
  });

  it("refuses a second withdrawal with the same key — this is what makes a retry safe", async () => {
    const error = await refusal(`
      INSERT INTO "withdrawal" ("id","partnerId","payoutMethodId","reference","amountMinor",
        "currency","status","period","basis","idempotencyKey","requestedAt","updatedAt")
      VALUES (gen_random_uuid(),'${PARTNER}','${METHOD}','WD-K2',50000,'USD','REQUESTED',
              '2026-03','x','${KEY}',now(),now())`);
    expect(error).toMatch(/duplicate key|unique/i);
  });

  it("scopes the key to the partner, so one partner cannot replay another's", async () => {
    // A globally unique key would let a caller who guessed another partner's key
    // collide with their withdrawal.
    await db.exec(`
      INSERT INTO "payout_method" ("id","partnerId","kind","label","maskedDetail",
        "providerToken","providerName","speed","fee","isDefault","createdAt","updatedAt")
      VALUES ('77777777-7777-7777-7777-777777777777','${OTHER_PARTNER}','BANK','Other',
              '•••• 9999','tok_other','wise','2-5 days','1.2%',true,now(),now())`);

    const error = await refusal(`
      INSERT INTO "withdrawal" ("id","partnerId","payoutMethodId","reference","amountMinor",
        "currency","status","period","basis","idempotencyKey","requestedAt","updatedAt")
      VALUES (gen_random_uuid(),'${OTHER_PARTNER}','77777777-7777-7777-7777-777777777777',
              'WD-K3',50000,'USD','REQUESTED','2026-03','x','${KEY}',now(),now())`);
    expect(error).toBeNull();
  });
});

describe("at most one default payout method", () => {
  it("refuses a second default for the same partner", async () => {
    // `isDefault` is meaningless if two rows carry it.
    const error = await refusal(`
      INSERT INTO "payout_method" ("id","partnerId","kind","label","maskedDetail",
        "providerToken","providerName","speed","fee","isDefault","createdAt","updatedAt")
      VALUES (gen_random_uuid(),'${PARTNER}','WISE','Wise','•••• 1111','tok2','wise',
              '1-2 days','0.9%',true,now(),now())`);
    expect(error).toMatch(/payout_method_one_default_per_partner|duplicate key/i);
  });

  it("permits a second non-default method", async () => {
    const error = await refusal(`
      INSERT INTO "payout_method" ("id","partnerId","kind","label","maskedDetail",
        "providerToken","providerName","speed","fee","isDefault","createdAt","updatedAt")
      VALUES (gen_random_uuid(),'${PARTNER}','WISE','Wise','•••• 2222','tok3','wise',
              '1-2 days','0.9%',false,now(),now())`);
    expect(error).toBeNull();
  });

  it("ignores archived methods, so a replaced default does not block the new one", async () => {
    await db.exec(`
      INSERT INTO "payout_method" ("id","partnerId","kind","label","maskedDetail",
        "providerToken","providerName","speed","fee","isDefault","archivedAt","createdAt","updatedAt")
      VALUES (gen_random_uuid(),'${OTHER_PARTNER}','BANK','Old','•••• 3333','tok4','wise',
              '2-5 days','1.2%',true,now(),now(),now())`);

    // The live default for OTHER_PARTNER already exists; the archived one must not
    // collide with it.
    const result = await db.query<{ n: string }>(
      `SELECT count(*) AS n FROM "payout_method" WHERE "partnerId"='${OTHER_PARTNER}'`,
    );
    expect(Number(result.rows[0]!.n)).toBe(2);
  });
});

describe("the audit trail is append-only", () => {
  const WITHDRAWAL = "88888888-8888-8888-8888-888888888888";

  beforeAll(async () => {
    await db.exec(`
      INSERT INTO "withdrawal" ("id","partnerId","payoutMethodId","reference","amountMinor",
        "currency","status","period","basis","idempotencyKey","requestedAt","updatedAt")
      VALUES ('${WITHDRAWAL}','${PARTNER}','${METHOD}','WD-AUDIT',50000,'USD','REQUESTED',
              '2026-03','x',gen_random_uuid()::text,now(),now());

      INSERT INTO "withdrawal_event" ("id","withdrawalId","fromStatus","toStatus","at")
      VALUES (gen_random_uuid(),'${WITHDRAWAL}',NULL,'REQUESTED',now());
    `);
  });

  it("accepts new events", async () => {
    const error = await refusal(`
      INSERT INTO "withdrawal_event" ("id","withdrawalId","fromStatus","toStatus","note","at")
      VALUES (gen_random_uuid(),'${WITHDRAWAL}','REQUESTED','APPROVED','ok',now())`);
    expect(error).toBeNull();
  });

  it("refuses an UPDATE — a mutable audit trail is not an audit trail", async () => {
    // This is the record a payment dispute is settled from. If a row can be edited
    // after the fact its evidential value is zero.
    const error = await refusal(
      `UPDATE "withdrawal_event" SET "note"='rewritten' WHERE "withdrawalId"='${WITHDRAWAL}'`,
    );
    expect(error).toMatch(/append-only/i);
  });

  it("refuses a DELETE", async () => {
    const error = await refusal(
      `DELETE FROM "withdrawal_event" WHERE "withdrawalId"='${WITHDRAWAL}'`,
    );
    expect(error).toMatch(/append-only/i);
  });

  it("leaves the events intact after both refusals", async () => {
    const result = await db.query<{ n: string }>(
      `SELECT count(*) AS n FROM "withdrawal_event" WHERE "withdrawalId"='${WITHDRAWAL}'`,
    );
    expect(Number(result.rows[0]!.n)).toBe(2);
  });
});

describe("a payout method cannot be hard-deleted out from under a withdrawal", () => {
  it("refuses the delete, which is why archiving is a soft delete", async () => {
    const error = await refusal(`DELETE FROM "payout_method" WHERE "id"='${METHOD}'`);
    expect(error).toMatch(/foreign key|violates/i);
  });
});

describe("lead retention", () => {
  it("refuses a retention window that ends before consent begins", async () => {
    // A negative window would make the purge job delete leads on arrival.
    const error = await refusal(`
      INSERT INTO "lead" ("id","kind","payload","email","consentAt","retentionUntil","status","createdAt")
      VALUES (gen_random_uuid(),'CONTACT','{}'::jsonb,'a@b.test',now(),now() - interval '1 day','NEW',now())`);
    expect(error).toMatch(/lead_retention_after_consent/);
  });

  it("accepts a forward-dated retention window", async () => {
    const error = await refusal(`
      INSERT INTO "lead" ("id","kind","payload","email","consentAt","retentionUntil","status","createdAt")
      VALUES (gen_random_uuid(),'MEDICAL','{}'::jsonb,'a@b.test',now(),now() + interval '90 days','NEW',now())`);
    expect(error).toBeNull();
  });
});
