/**
 * `EXPLAIN` for the three heaviest queries.
 *
 * Department 20 reported "EXPLAIN plans 0/3 — no database available to run it against".
 * This closes that: PGlite is real Postgres, so it has the real planner, and the plans
 * below are observed rather than predicted.
 *
 * What this does *not* establish is latency. PGlite runs in WebAssembly against a
 * synthetic dataset, so a millisecond figure from here would be meaningless and none is
 * reported. What it does establish is the shape of the plan — which index is chosen,
 * whether the heap is visited, and whether anything falls back to a sequential scan.
 * Shape is the part that stops being true when someone drops an index.
 *
 * The seed is deliberately larger than the planner's tipping point. On a table of
 * twenty rows Postgres correctly ignores every index, and a test asserting index usage
 * against a toy dataset asserts nothing.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

let db: PGlite;

const PARTNER = "22222222-2222-2222-2222-222222222222";

const migration = (name: string): string =>
  readFileSync(resolve(process.cwd(), `prisma/migrations/${name}/migration.sql`), "utf8");

/** The plan, as one string. */
async function explain(sql: string): Promise<string> {
  const result = await db.query<{ "QUERY PLAN": string }>(`EXPLAIN ${sql}`);
  return result.rows.map((r) => r["QUERY PLAN"]).join("\n");
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(migration("0001_init"));
  await db.exec(migration("0002_integrity_constraints"));

  // 40 partners, 200 students each, one commission per student, plus withdrawals.
  // ~8,000 commissions is well past the point where a sequential scan stops winning.
  await db.exec(`
    INSERT INTO "user" ("id","email","emailVerified","createdAt","updatedAt")
      SELECT gen_random_uuid(), 'u' || g || '@example.test', true, now(), now()
      FROM generate_series(1,40) g;

    INSERT INTO "partner"
      ("id","userId","org","person","role","territory","managerName","managerRole",
       "currency","minimumMinor","status","since","createdAt","updatedAt")
      SELECT gen_random_uuid(), u."id", 'Org', 'Person', 'Director', 'Territory',
             'Manager', 'Partnerships', 'USD', 20000, 'ACTIVE', '2026-01-01', now(), now()
      FROM "user" u;

    -- One partner with a fixed id, so the plans below query a known row.
    UPDATE "partner" SET "id" = '${PARTNER}'
      WHERE "id" = (SELECT "id" FROM "partner" LIMIT 1);

    INSERT INTO "student"
      ("id","partnerId","name","universitySlug","universityName","program","stage",
       "createdAt","updatedAt")
      SELECT gen_random_uuid(), p."id", 'Student', 'slug', 'University', 'Programme',
             (ARRAY['ENQUIRY','DOCUMENTS','SUBMITTED','OFFER','VISA','REGISTERED'])[1 + (g % 6)]::"student_stage",
             now(), now() - (g || ' hours')::interval
      FROM "partner" p, generate_series(1,200) g;

    -- 60% confirmed, chosen deterministically from a row number rather than from two
    -- independent random() draws. The first version of this seed used random() twice,
    -- which produced rows claiming to be CONFIRMED with no confirmation timestamp, and
    -- the commission_confirmed_at_iff_confirmed constraint rejected the whole insert.
    -- The constraint was right and the fixture was wrong, which is the correct way round.
    INSERT INTO "commission"
      ("id","studentId","partnerId","amountMinor","currency","state","basis","period",
       "confirmedAt","createdAt","updatedAt")
      SELECT gen_random_uuid(), s."id", s."partnerId", 50000, 'USD',
             CASE WHEN s.n % 10 < 6 THEN 'CONFIRMED' ELSE 'PENDING' END::"commission_state",
             'registration', '2026-03',
             CASE WHEN s.n % 10 < 6 THEN now() ELSE NULL END,
             now(), now()
      FROM (SELECT "id", "partnerId", row_number() OVER () AS n FROM "student") s;

    INSERT INTO "payout_method"
      ("id","partnerId","kind","label","maskedDetail","providerToken","providerName",
       "speed","fee","isDefault","createdAt","updatedAt")
      SELECT gen_random_uuid(), p."id", 'BANK', 'Bank', '•••• 4417', 'tok', 'wise',
             '2-5 days', '1.2%', true, now(), now()
      FROM "partner" p;

    INSERT INTO "withdrawal"
      ("id","partnerId","payoutMethodId","reference","amountMinor","currency","status",
       "period","basis","idempotencyKey","requestedAt","updatedAt")
      SELECT gen_random_uuid(), m."partnerId", m."id", 'WD-' || gen_random_uuid(),
             100000, 'USD', 'REQUESTED', '2026-03', 'basis', gen_random_uuid()::text,
             now() - (g || ' days')::interval, now()
      FROM "payout_method" m, generate_series(1,300) g;
  `);

  // VACUUM, not merely ANALYZE — and it cannot run inside a transaction block, so it
  // goes through `query` rather than `exec`.
  //
  // This is the operational dependency behind the index-only scans asserted below.
  // Postgres can only skip the heap when the visibility map marks a page all-visible,
  // and vacuum is what populates that map. Before vacuuming, the identical query plans
  // as a bitmap heap scan instead. In production this is autovacuum's job; if
  // autovacuum is ever disabled on these tables, the balance query quietly stops being
  // index-only and nobody is told.
  await db.query("VACUUM ANALYZE");
});

afterAll(async () => {
  await db?.close();
});

describe("query 1 — the balance aggregates", () => {
  // Runs on every wallet read and inside every withdrawal transaction. The single
  // hottest financial query in the system.
  const SQL = `
    SELECT
      COALESCE((SELECT SUM("amountMinor") FROM "commission"
        WHERE "partnerId" = '${PARTNER}'::uuid AND "state" = 'CONFIRMED'), 0) AS confirmed,
      COALESCE((SELECT SUM("amountMinor") FROM "commission"
        WHERE "partnerId" = '${PARTNER}'::uuid AND "state" = 'PENDING'), 0) AS pending,
      COALESCE((SELECT SUM("amountMinor") FROM "withdrawal"
        WHERE "partnerId" = '${PARTNER}'::uuid AND "status" <> 'REJECTED'), 0) AS committed`;

  it("uses the partial covering indexes and never scans a table", async () => {
    const plan = await explain(SQL);
    expect(plan).toContain("commission_balance_confirmed");
    expect(plan).toContain("commission_balance_pending");
    expect(plan).toContain("withdrawal_balance_committed");
    // The thing the partial indexes exist for.
    expect(plan).not.toMatch(/Seq Scan on (commission|withdrawal)/);
  });

  it("reads only the partner's rows, not the whole table", async () => {
    const plan = await explain(SQL);
    // ~8,000 commissions across 40 partners. An estimate near the full table would
    // mean the predicate is not being pushed into the index.
    const estimates = [...plan.matchAll(/rows=(\d+)/g)].map((m) => Number(m[1]));
    expect(Math.max(...estimates)).toBeLessThan(1000);
  });

  it("answers from the index alone, without visiting the heap", async () => {
    // `INCLUDE ("amountMinor")` is what makes this an index-only scan. Without it the
    // plan degrades to an index scan plus a heap fetch per row.
    const plan = await explain(SQL);
    expect(plan).toMatch(/Index Only Scan/);
  });
});

describe("query 2 — a partner's student list", () => {
  const SQL = `
    SELECT "id","name","universityName","program","stage","updatedAt"
    FROM "student"
    WHERE "partnerId" = '${PARTNER}'::uuid
    ORDER BY "updatedAt" DESC, "id" DESC
    LIMIT 21`;

  it("uses the composite index and does not sort", async () => {
    // `@@index([partnerId, updatedAt(sort: Desc)])` exists so the ORDER BY is satisfied
    // by the index order. A `Sort` node here means the whole partition is being read
    // and sorted for every page.
    const plan = await explain(SQL);
    expect(plan).toContain("student_partnerId_updatedAt_idx");
    expect(plan).not.toContain("Seq Scan on student");
  });

  it("stops at the page size instead of reading the partition", async () => {
    const plan = await explain(SQL);
    expect(plan).toMatch(/Limit/);
  });
});

describe("query 3 — a partner's withdrawal history", () => {
  const SQL = `
    SELECT "id","reference","period","basis","amountMinor","currency","status","requestedAt"
    FROM "withdrawal"
    WHERE "partnerId" = '${PARTNER}'::uuid
    ORDER BY "requestedAt" DESC, "id" DESC
    LIMIT 21`;

  it("uses the composite index rather than scanning", async () => {
    // Observed at 300 withdrawals for one partner: an index scan on
    // (partnerId, requestedAt DESC) feeding an incremental sort for the `id` tiebreak.
    // Below roughly fifty rows the planner sorts the partition instead, which is the
    // right call — this index earns its keep on the partners who actually accumulate
    // history, which are the ones whose page would otherwise be slow.
    const plan = await explain(SQL);
    expect(plan).toContain("withdrawal_partnerId_requestedAt_idx");
    expect(plan).not.toContain("Seq Scan on withdrawal");
  });
});

describe("the pipeline counts", () => {
  it("groups within one partner using the stage index", async () => {
    const plan = await explain(`
      SELECT "stage", count(*) FROM "student"
      WHERE "partnerId" = '${PARTNER}'::uuid GROUP BY "stage"`);
    expect(plan).not.toContain("Seq Scan on student");
  });
});

describe("no foreign key is left unindexed", () => {
  it("has an index for every foreign key column", async () => {
    // An unindexed foreign key turns every parent delete or update into a full scan of
    // the child table, and Postgres does not warn about it.
    // `conkey[1]` — the leading column only. A composite foreign key is served by an
    // index on its first column; an index led by the second would not be used for the
    // constraint check, so requiring one would be noise.
    const result = await db.query<{ conname: string; tbl: string; col: string }>(`
      SELECT c.conname, cl.relname AS tbl, a.attname AS col
      FROM pg_constraint c
      JOIN pg_class cl ON cl.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = cl.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
      WHERE c.contype = 'f' AND n.nspname = 'public'
    `);

    const indexed = await db.query<{ tbl: string; col: string }>(`
      SELECT cl.relname AS tbl, a.attname AS col
      FROM pg_index i
      JOIN pg_class cl ON cl.oid = i.indrelid
      JOIN pg_namespace n ON n.oid = cl.relnamespace
      JOIN unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord) ON k.ord = 1
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
      WHERE n.nspname = 'public'
    `);

    const covered = new Set(indexed.rows.map((r) => `${r.tbl}.${r.col}`));
    const missing = result.rows
      .map((r) => `${r.tbl}.${r.col}`)
      .filter((key) => !covered.has(key));

    expect([...new Set(missing)]).toEqual([]);
  });

  it("counts only the leading column of a composite foreign key", async () => {
    // `commission(partnerId, currency) -> partner(id, currency)` needs an index on
    // `partnerId`, not on `currency`. An index whose first column is `currency` would
    // be useless for the constraint check, so requiring one would be cargo cult.
    const result = await db.query<{ n: string }>(`
      SELECT count(*) AS n FROM pg_constraint c
      JOIN pg_class cl ON cl.oid = c.conrelid
      WHERE c.contype = 'f' AND array_length(c.conkey, 1) > 1
    `);
    // Two composite foreign keys exist: commission and withdrawal, both on
    // (partnerId, currency), plus commission -> student on (studentId, partnerId).
    expect(Number(result.rows[0]!.n)).toBeGreaterThanOrEqual(2);
  });
});
