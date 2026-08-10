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
// 0005 creates a trigram index for university search. PGlite ships contrib extensions as
// separate bundles rather than compiling them all into the base image, so the extension
// has to be handed to the constructor — without it the migration fails with "extension
// pg_trgm is not available", which is a fact about this harness and not about the schema.
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
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
  db = new PGlite({ extensions: { pg_trgm } });

  /**
   * Every migration, in order, exactly as `prisma migrate deploy` would apply them.
   *
   * This is itself the first assertion, and it has caught two things a schema dump never
   * could: that each file runs, and that it runs *after the ones before it*. A migration
   * is only ever applied once against the real database, so a file that depends on state
   * a later file removes fails on the client's machine and nowhere else.
   *
   * Listed rather than globbed. A glob would silently stop covering a migration whose
   * directory was named unexpectedly, and would sort `0010` before `0002` on the day the
   * count reaches three digits.
   */
  for (const name of [
    "0001_init",
    "0002_integrity_constraints",
    "0003_user_roles",
    "0004_representative",
    "0005_universities",
    "0006_applications",
    "0007_student_profile",
    "0008_documents",
    "0009_notifications_messaging_audit",
    "0010_retire_staff_role",
    "0011_leads_inquiries_attribution",
    "0012_lead_type_remap",
  ]) {
    await db.exec(migration(name));
  }

  // A minimal, valid world. Everything below mutates from here.
  //
  // `role` is stated rather than left to default. 0003 installs a trigger refusing a
  // partner record whose user is not a PARTNER — the one that stops a staff account
  // quietly acquiring a wallet it could then approve payouts from — and the default is
  // STUDENT. The fixture predates that trigger and was invalid against it, which nothing
  // could see while this suite stopped applying migrations at 0002.
  await db.exec(`
    INSERT INTO "user" ("id","email","emailVerified","role","createdAt","updatedAt")
      VALUES ('${USER}','partner@example.test',true,'PARTNER',now(),now()),
             ('${OTHER_USER}','other@example.test',true,'PARTNER',now(),now());

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
},
/**
 * 60 seconds, against a default of 10.
 *
 * This hook boots a Postgres compiled to WebAssembly and applies twelve migrations to
 * it. Alone that takes about three seconds; sharing a machine with two dozen other test
 * files running in parallel it does not, and the failure was a hook timeout rather than
 * anything wrong with the SQL — which is a confusing way to find out, because the file
 * passes when run on its own.
 *
 * Raised rather than the migrations trimmed: applying fewer of them is what let the
 * fixture drift out of agreement with the schema for ten migrations.
 */
60_000);

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
      INSERT INTO "lead" ("id","kind","email","consentAt","retentionUntil","status","createdAt","updatedAt")
      VALUES (gen_random_uuid(),'CONTACT','negative@b.test',now(),now() - interval '1 day','NEW',now(),now())`);
    expect(error).toMatch(/lead_retention_after_consent/);
  });

  it("accepts a forward-dated retention window", async () => {
    const error = await refusal(`
      INSERT INTO "lead" ("id","kind","email","consentAt","retentionUntil","status","createdAt","updatedAt")
      VALUES (gen_random_uuid(),'MEDICAL','forward@b.test',now(),now() + interval '90 days','NEW',now(),now())`);
    expect(error).toBeNull();
  });

  it("refuses a second lead for the same address", async () => {
    // A lead is a person. Two rows for one address is the state the reshape removed:
    // the desk sees the same person twice and neither row has the other's history.
    const error = await refusal(`
      INSERT INTO "lead" ("id","kind","email","consentAt","retentionUntil","status","createdAt","updatedAt")
      VALUES (gen_random_uuid(),'STUDY','forward@b.test',now(),now() + interval '730 days','NEW',now(),now())`);
    expect(error).toMatch(/lead_email_key|duplicate key/i);
  });
});

describe("inquiries", () => {
  const LEAD = "77777777-7777-7777-7777-777777777777";

  const MEDICAL_INQUIRY = "99999999-9999-9999-9999-999999999999";

  beforeAll(async () => {
    // A person who asked about a treatment: one lead, one 90-day inquiry. The tests below
    // add a second, longer-lived enquiry from the same person and take it away again.
    await db.exec(`
      INSERT INTO "lead" ("id","kind","email","consentAt","retentionUntil","status","createdAt","updatedAt")
      VALUES ('${LEAD}','MEDICAL','inq@b.test',now(),now() + interval '90 days','NEW',now(),now());

      INSERT INTO "inquiry" ("id","leadId","type","payload","consentAt","retentionUntil","createdAt","updatedAt")
      VALUES ('${MEDICAL_INQUIRY}','${LEAD}','MEDICAL','{}'::jsonb,now(),now() + interval '90 days',now(),now());
    `);
  });

  it("refuses a retention window that ends before consent, exactly as a lead does", async () => {
    const error = await refusal(`
      INSERT INTO "inquiry" ("id","leadId","type","payload","consentAt","retentionUntil","createdAt","updatedAt")
      VALUES (gen_random_uuid(),'${LEAD}','CONTACT','{}'::jsonb,now(),now() - interval '1 day',now(),now())`);
    expect(error).toMatch(/inquiry_retention_after_consent/);
  });

  it("refuses a response with no responder", async () => {
    // A row that says it was answered but cannot say by whom is a row an SLA report
    // cannot use and a complaint cannot be traced through.
    const error = await refusal(`
      INSERT INTO "inquiry" ("id","leadId","type","payload","status","respondedAt","consentAt","retentionUntil","createdAt","updatedAt")
      VALUES (gen_random_uuid(),'${LEAD}','CONTACT','{}'::jsonb,'ANSWERED',now(),now(),now() + interval '1 day',now(),now())`);
    expect(error).toMatch(/inquiry_responded_has_handler/);
  });

  it("refuses a responder with no response time", async () => {
    const error = await refusal(`
      INSERT INTO "inquiry" ("id","leadId","type","payload","handledByUserId","consentAt","retentionUntil","createdAt","updatedAt")
      VALUES (gen_random_uuid(),'${LEAD}','CONTACT','{}'::jsonb,'${USER}',now(),now() + interval '1 day',now(),now())`);
    expect(error).toMatch(/inquiry_responded_has_handler/);
  });

  /**
   * The trigger installed by 0011, and the reason it exists.
   *
   * `lead.retentionUntil` drives the purge. Computed in the application it would be
   * computed in two places — the submit path and the purge — and the one that got it
   * wrong would either delete data early or keep it past its promise. Both are the kind
   * of bug nobody notices until somebody asks.
   */
  describe("a lead's retention window follows its inquiries", () => {
    it("extends when a longer-lived inquiry arrives", async () => {
      await db.exec(`
        INSERT INTO "inquiry" ("id","leadId","type","payload","consentAt","retentionUntil","createdAt","updatedAt")
        VALUES ('88888888-8888-8888-8888-888888888888','${LEAD}','STUDY','{}'::jsonb,
                now(),now() + interval '730 days',now(),now());
      `);

      const result = await db.query<{ days: number }>(
        `SELECT extract(day from "retentionUntil" - now())::int AS days FROM "lead" WHERE "id"='${LEAD}'`,
      );
      expect(result.rows[0]!.days).toBeGreaterThan(700);
    });

    it("contracts again when that inquiry is purged, leaving the medical window", async () => {
      /**
       * This is the case that matters, and the reason retention is per message.
       *
       * The person now has two enquiries: a medical one expiring in 90 days and a study
       * one expiring in 730. When the study enquiry is deleted the lead must fall back
       * to 90 — otherwise health data would live for two years because the same person
       * later asked about a degree, and nobody would ever see that it had.
       */
      await db.exec(`DELETE FROM "inquiry" WHERE "id"='88888888-8888-8888-8888-888888888888'`);

      const result = await db.query<{ days: number }>(
        `SELECT extract(day from "retentionUntil" - now())::int AS days FROM "lead" WHERE "id"='${LEAD}'`,
      );
      expect(result.rows[0]!.days).toBeLessThan(100);
    });

    it("leaves the window alone when the last inquiry goes, rather than writing NULL", async () => {
      /**
       * The `max_until IS NOT NULL` guard in the trigger. A lead whose every enquiry has
       * been purged has nothing to derive a date from, and `retentionUntil` is NOT NULL —
       * so the trigger declines rather than failing the delete.
       *
       * The stale date is harmless because it is never read again: `purgeExpiredLeads`
       * removes leads by `inquiries: { none: {} }`, not by date. Asserted here so that
       * anyone who later makes the purge date-driven finds out that it cannot be.
       */
      await db.exec(`DELETE FROM "inquiry" WHERE "id"='${MEDICAL_INQUIRY}'`);

      const result = await db.query<{ n: string }>(
        `SELECT count(*) AS n FROM "lead" WHERE "id"='${LEAD}' AND "retentionUntil" IS NOT NULL`,
      );
      expect(Number(result.rows[0]!.n)).toBe(1);
    });
  });

  it("takes its inquiries and attribution with it when deleted", async () => {
    await db.exec(`
      INSERT INTO "lead_attribution" ("id","leadId","source","campaign","createdAt")
      VALUES (gen_random_uuid(),'${LEAD}','google','autumn-intake',now());
      DELETE FROM "lead" WHERE "id"='${LEAD}';
    `);

    const left = await db.query<{ n: string }>(`
      SELECT (SELECT count(*) FROM "inquiry" WHERE "leadId"='${LEAD}')
           + (SELECT count(*) FROM "lead_attribution" WHERE "leadId"='${LEAD}') AS n
    `);
    // A purge that leaves the attribution behind leaves a campaign record pointing at a
    // person who was deleted for asking to be.
    expect(Number(left.rows[0]!.n)).toBe(0);
  });
});

describe("the retired APPLY value", () => {
  it("is gone from every row", async () => {
    // 0012's own assertion proves this at migration time. Repeating it here proves the
    // migration ran, rather than that it was written.
    const result = await db.query<{ n: string }>(`
      SELECT (SELECT count(*) FROM "lead" WHERE "kind"='APPLY')
           + (SELECT count(*) FROM "inquiry" WHERE "type"='APPLY') AS n
    `);
    expect(Number(result.rows[0]!.n)).toBe(0);
  });

  it("still exists in the type, because dropping it would rewrite every table that uses it", async () => {
    const result = await db.query<{ enumlabel: string }>(
      `SELECT enumlabel FROM pg_enum e
       JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = 'lead_kind' AND e.enumlabel = 'APPLY'`,
    );
    expect(result.rows).toHaveLength(1);
  });

  it("accepts every value the application can write", async () => {
    const result = await db.query<{ enumlabel: string }>(
      `SELECT enumlabel FROM pg_enum e
       JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = 'lead_kind'`,
    );
    const values = result.rows.map((row) => row.enumlabel);

    // Mirrors `leadTypes`. A service desk whose value never reached the database would
    // present as a contact form that fails only for that one topic.
    for (const type of [
      "STUDY", "MEDICAL", "BUSINESS", "EMPLOYMENT", "TOURS",
      "CONTACT", "PARTNER", "REPRESENTATIVE",
    ]) {
      expect(values).toContain(type);
    }
  });
});
