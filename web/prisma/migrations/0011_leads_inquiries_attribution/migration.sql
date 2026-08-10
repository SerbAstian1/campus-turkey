-- Reshape leads — brief §19, §20, §21.
--
-- Three things happen here, and they are one migration because they are one change:
--
--   1. `lead` stops being a message and becomes a person. The queryable fields come out
--      of `payload` and become columns, because §59's inbox filters on them and a JSON
--      column cannot be indexed for that usefully.
--   2. `inquiry` takes over the message: what was asked, what was consented to, and when
--      it must be deleted. Per-message retention is the point — held on one row, a
--      90-day medical policy and a 3-year partner policy cannot both be honoured, and
--      the longer one wins by accident.
--   3. `lead_attribution` records where they came from, in a table that can be dropped
--      on its own without touching the enquiry.
--
-- The enum gains four values but uses none of them: Postgres refuses to use a value
-- added by the same transaction. Migration 0012 does the remap.

-- ---------------------------------------------------------------- enum, additively

-- Never renamed in place. A rename is a moment where a failed deploy leaves rows
-- referencing a value that no longer exists; adding is a moment where nothing can break.
-- `APPLY` stays until 0012 has rewritten every row, and then stays anyway — dropping an
-- enum value means recreating the type and rewriting every column that uses it.
ALTER TYPE "lead_kind" ADD VALUE IF NOT EXISTS 'STUDY';
ALTER TYPE "lead_kind" ADD VALUE IF NOT EXISTS 'BUSINESS';
ALTER TYPE "lead_kind" ADD VALUE IF NOT EXISTS 'EMPLOYMENT';
ALTER TYPE "lead_kind" ADD VALUE IF NOT EXISTS 'TOURS';

CREATE TYPE "inquiry_status" AS ENUM ('OPEN', 'ANSWERED', 'CLOSED');

-- ------------------------------------------------------------------ lead: columns

ALTER TABLE "lead"
  ADD COLUMN "name"             text,
  ADD COLUMN "phone"            text,
  ADD COLUMN "country"          text,
  ADD COLUMN "serviceInterest"  text,
  ADD COLUMN "assignedToUserId" uuid,
  ADD COLUMN "convertedUserId"  uuid,
  ADD COLUMN "updatedAt"        timestamptz(3) NOT NULL DEFAULT now();

-- Lift the promoted fields out of the JSON they were living in. `->>` yields NULL for a
-- missing key, which is exactly the wanted result: absent stays absent rather than
-- becoming an empty string that sorts and filters as a real value.
UPDATE "lead" SET
  "name"    = nullif(btrim("payload" ->> 'name'), ''),
  "phone"   = nullif(btrim("payload" ->> 'phone'), ''),
  "country" = nullif(btrim("payload" ->> 'country'), '');

ALTER TABLE "lead"
  ADD CONSTRAINT "lead_assignedToUserId_fkey"
    FOREIGN KEY ("assignedToUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "lead_convertedUserId_fkey"
    FOREIGN KEY ("convertedUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ------------------------------------------------------------------ inquiry table

CREATE TABLE "inquiry" (
    "id"              uuid NOT NULL,
    "leadId"          uuid NOT NULL,
    "type"            "lead_kind" NOT NULL,
    "subject"         text,
    "message"         text,
    "payload"         jsonb NOT NULL,
    "status"          "inquiry_status" NOT NULL DEFAULT 'OPEN',
    "handledByUserId" uuid,
    "respondedAt"     timestamptz(3),
    "consentAt"       timestamptz(3) NOT NULL,
    "retentionUntil"  timestamptz(3) NOT NULL,
    "ipPrefix"        text,
    "createdAt"       timestamptz(3) NOT NULL DEFAULT now(),
    "updatedAt"       timestamptz(3) NOT NULL DEFAULT now(),

    CONSTRAINT "inquiry_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "inquiry"
  ADD CONSTRAINT "inquiry_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "lead"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "inquiry_handledByUserId_fkey"
    FOREIGN KEY ("handledByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- The same rule `lead` has carried since 0002: a retention window that ends before the
-- consent that started it would make the purge delete the row on arrival.
ALTER TABLE "inquiry"
  ADD CONSTRAINT "inquiry_retention_after_consent" CHECK ("retentionUntil" > "consentAt");

-- A response is a fact with a time. Recording one without the other leaves a row that
-- says it was answered and cannot say when, which is the state an SLA report cannot use.
ALTER TABLE "inquiry"
  ADD CONSTRAINT "inquiry_responded_has_handler" CHECK (
    ("respondedAt" IS NULL AND "handledByUserId" IS NULL)
    OR ("respondedAt" IS NOT NULL AND "handledByUserId" IS NOT NULL)
  );

CREATE INDEX "inquiry_leadId_createdAt_idx" ON "inquiry"("leadId", "createdAt" DESC);
CREATE INDEX "inquiry_status_createdAt_idx" ON "inquiry"("status", "createdAt" DESC);
CREATE INDEX "inquiry_type_createdAt_idx"   ON "inquiry"("type", "createdAt" DESC);
CREATE INDEX "inquiry_retentionUntil_idx"   ON "inquiry"("retentionUntil");

-- Every existing lead becomes one inquiry, carrying its own consent and retention dates
-- forward unchanged. Nothing is recomputed: the retention window a visitor was promised
-- is the one already on the row, and a migration that quietly extends it is a migration
-- that breaks a promise.
INSERT INTO "inquiry" (
  "id", "leadId", "type", "subject", "message", "payload",
  "consentAt", "retentionUntil", "ipPrefix", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid(),
  l."id",
  l."kind",
  nullif(btrim(l."payload" ->> 'subject'), ''),
  coalesce(
    nullif(btrim(l."payload" ->> 'message'), ''),
    -- MEDICAL put its free text in `treatment`, REPRESENTATIVE in `experience`. Those
    -- are the body of the message under another name.
    nullif(btrim(l."payload" ->> 'treatment'), ''),
    nullif(btrim(l."payload" ->> 'experience'), '')
  ),
  l."payload",
  l."consentAt",
  l."retentionUntil",
  l."ipPrefix",
  l."createdAt",
  l."createdAt"
FROM "lead" l;

-- ------------------------------------------------------- lead: one row per person
--
-- `email` becomes unique, so duplicates have to be merged first. The oldest row wins the
-- identity — it is the one an assignment or a note would already be attached to — and
-- the newer rows' inquiries are moved onto it before they are deleted. The inquiries
-- were created above, so no message is lost by this.

WITH ranked AS (
  SELECT "id", "email",
         first_value("id") OVER (PARTITION BY lower("email") ORDER BY "createdAt", "id") AS keeper
  FROM "lead"
)
UPDATE "inquiry" i
SET "leadId" = r.keeper
FROM ranked r
WHERE i."leadId" = r."id" AND r."id" <> r.keeper;

WITH ranked AS (
  SELECT "id",
         first_value("id") OVER (PARTITION BY lower("email") ORDER BY "createdAt", "id") AS keeper
  FROM "lead"
)
DELETE FROM "lead" l
USING ranked r
WHERE l."id" = r."id" AND r."id" <> r.keeper;

-- Addresses are compared case-insensitively above but stored as given. Normalising them
-- makes the unique index mean what the comparison meant; the service layer lowercases on
-- write (`z.string().toLowerCase()`), so this only touches rows written before it did.
UPDATE "lead" SET "email" = lower("email") WHERE "email" <> lower("email");

CREATE UNIQUE INDEX "lead_email_key" ON "lead"("email");

CREATE INDEX "lead_status_createdAt_idx"    ON "lead"("status", "createdAt" DESC);
CREATE INDEX "lead_assignedToUserId_status_idx" ON "lead"("assignedToUserId", "status");
CREATE INDEX "lead_country_idx"             ON "lead"("country");

-- `payload` now lives on `inquiry`, and keeping a copy here would be two rows holding the
-- same fact — the shape that produced the `Student.stage` bug 0006 had to fix with a
-- trigger. Dropped in the same transaction that copied it out, so there is no window in
-- which the copy could drift.
ALTER TABLE "lead" DROP COLUMN "payload";

-- --------------------------------------------------- retention, kept in one place
--
-- `lead.retentionUntil` is now derived: the latest expiry among its inquiries. Written by
-- trigger rather than by the application for the reason `sync_student_stage` exists — two
-- places computing one value is two places to get it wrong, and the one that gets it
-- wrong here deletes data early or keeps it too long.

CREATE OR REPLACE FUNCTION sync_lead_retention() RETURNS trigger AS $$
DECLARE target uuid;
BEGIN
  target := coalesce(NEW."leadId", OLD."leadId");

  UPDATE "lead" l
  SET "retentionUntil" = sub.max_until,
      "consentAt"      = sub.min_consent
  FROM (
    SELECT max("retentionUntil") AS max_until, min("consentAt") AS min_consent
    FROM "inquiry" WHERE "leadId" = target
  ) sub
  WHERE l."id" = target AND sub.max_until IS NOT NULL;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_lead_retention() IS
  'Keeps lead.retentionUntil at the latest expiry among its inquiries, and lead.consentAt at the earliest consent. Derived — do not write either column from the application.';

CREATE TRIGGER inquiry_sync_lead_retention
AFTER INSERT OR UPDATE OF "retentionUntil", "consentAt", "leadId" OR DELETE ON "inquiry"
FOR EACH ROW EXECUTE FUNCTION sync_lead_retention();

-- Bring every existing lead into agreement with the inquiries just created for it. After
-- a merge the keeper holds several, and its own dates are only the first one's.
UPDATE "lead" l
SET "retentionUntil" = sub.max_until,
    "consentAt"      = sub.min_consent
FROM (
  SELECT "leadId", max("retentionUntil") AS max_until, min("consentAt") AS min_consent
  FROM "inquiry" GROUP BY "leadId"
) sub
WHERE l."id" = sub."leadId";

-- ------------------------------------------------------------- lead_attribution

CREATE TABLE "lead_attribution" (
    "id"          uuid NOT NULL,
    "leadId"      uuid NOT NULL,
    "source"      text,
    "medium"      text,
    "campaign"    text,
    "term"        text,
    "content"     text,
    "landingPage" text,
    "referrer"    text,
    "createdAt"   timestamptz(3) NOT NULL DEFAULT now(),

    CONSTRAINT "lead_attribution_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "lead_attribution"
  ADD CONSTRAINT "lead_attribution_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "lead_attribution_leadId_key" ON "lead_attribution"("leadId");
CREATE INDEX "lead_attribution_source_medium_idx" ON "lead_attribution"("source", "medium");
CREATE INDEX "lead_attribution_campaign_idx" ON "lead_attribution"("campaign");

-- ------------------------------------------------------------------- assertions

-- Every lead must have at least one inquiry. A lead with none is a person with no reason
-- on file for having their details stored, which is both useless and a data-protection
-- problem — and it would mean the loop above dropped a message.
DO $$
DECLARE orphaned integer;
BEGIN
  SELECT count(*) INTO orphaned
  FROM "lead" l
  WHERE NOT EXISTS (SELECT 1 FROM "inquiry" i WHERE i."leadId" = l."id");

  IF orphaned > 0 THEN
    RAISE EXCEPTION '% lead(s) have no inquiry after the backfill. The payload move lost a message.', orphaned;
  END IF;
END;
$$;

-- No inquiry may outlive the promise made at submission. The dates were copied, not
-- recomputed, so this can only fail if the copy went wrong — which is exactly when it
-- needs to fail.
DO $$
DECLARE bad integer;
BEGIN
  SELECT count(*) INTO bad FROM "inquiry" WHERE "retentionUntil" <= "consentAt";
  IF bad > 0 THEN
    RAISE EXCEPTION '% inquiry row(s) expire at or before their consent date.', bad;
  END IF;
END;
$$;
