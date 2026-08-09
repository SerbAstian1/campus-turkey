-- Applications — brief §16, §17, §50, §51.
--
-- The central workflow object. Staff operate on applications, not on students: a student
-- is a person, an application is what is being done for them.
--
-- This migration also resolves the audit's second Blocker, two sources of truth for
-- student progress. See the note above the trigger at the bottom.

CREATE TYPE "application_status" AS ENUM (
  'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'DOCUMENTS_REQUIRED', 'DOCUMENTS_REVIEW',
  'APPLICATION_PROCESSING', 'UNIVERSITY_SUBMITTED', 'ADMISSION_PENDING', 'ADMITTED',
  'ADMISSION_REJECTED', 'VISA_PROCESS', 'VISA_APPROVED', 'VISA_REJECTED',
  'READY_FOR_TRAVEL', 'COMPLETED', 'CANCELLED'
);

-- Human-readable references, quoted on the phone and in email. A sequence rather than a
-- random string: an application number is read aloud, and "CT-2026-0041" survives that
-- while a uuid does not.
CREATE SEQUENCE IF NOT EXISTS "application_number_seq" AS bigint START WITH 1 INCREMENT BY 1;

CREATE TABLE "application" (
  "id"                uuid NOT NULL,
  "applicationNumber" text NOT NULL,
  "studentId"         uuid NOT NULL,
  "partnerId"         uuid,
  "representativeId"  uuid,
  "universityId"      uuid,
  "programId"         uuid,
  "status"            "application_status" NOT NULL DEFAULT 'DRAFT',
  "submittedAt"       timestamptz(3),
  "reviewedAt"        timestamptz(3),
  "approvedAt"        timestamptz(3),
  "rejectedAt"        timestamptz(3),
  "createdAt"         timestamptz(3) NOT NULL DEFAULT now(),
  "updatedAt"         timestamptz(3) NOT NULL,

  CONSTRAINT "application_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "application_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE RESTRICT,
  CONSTRAINT "application_partnerId_fkey"
    FOREIGN KEY ("partnerId") REFERENCES "partner"("id") ON DELETE RESTRICT,
  CONSTRAINT "application_representativeId_fkey"
    FOREIGN KEY ("representativeId") REFERENCES "representative_profile"("id") ON DELETE RESTRICT,
  CONSTRAINT "application_universityId_fkey"
    FOREIGN KEY ("universityId") REFERENCES "university"("id") ON DELETE RESTRICT,
  CONSTRAINT "application_programId_fkey"
    FOREIGN KEY ("programId") REFERENCES "program"("id") ON DELETE RESTRICT
);

CREATE UNIQUE INDEX "application_applicationNumber_key" ON "application" ("applicationNumber");
CREATE INDEX "application_studentId_idx" ON "application" ("studentId");
CREATE INDEX "application_partner_updated_idx" ON "application" ("partnerId", "updatedAt" DESC);
CREATE INDEX "application_representative_updated_idx" ON "application" ("representativeId", "updatedAt" DESC);
CREATE INDEX "application_status_updated_idx" ON "application" ("status", "updatedAt" DESC);
CREATE INDEX "application_universityId_idx" ON "application" ("universityId");
CREATE INDEX "application_createdAt_idx" ON "application" ("createdAt");

-- §16's invariant, in the database rather than in a service somebody might bypass.
-- Two referrers means two parties credited for one student, and the first time that
-- matters is when both are paid.
ALTER TABLE "application"
  ADD CONSTRAINT "application_referral_is_exclusive"
  CHECK (NOT ("partnerId" IS NOT NULL AND "representativeId" IS NOT NULL));

-- A programme must belong to the university it is being applied to. Without this an
-- application can name Ankara University and a Bilkent programme, and nothing complains
-- until somebody reads it.
CREATE OR REPLACE FUNCTION "assert_program_belongs_to_university"() RETURNS trigger
  LANGUAGE plpgsql AS $$
DECLARE owner_id uuid;
BEGIN
  IF NEW."programId" IS NULL THEN RETURN NEW; END IF;

  IF NEW."universityId" IS NULL THEN
    RAISE EXCEPTION 'An application with a programme must also name its university.'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  SELECT "universityId" INTO owner_id FROM "program" WHERE "id" = NEW."programId";

  IF owner_id IS DISTINCT FROM NEW."universityId" THEN
    RAISE EXCEPTION
      'Programme % does not belong to university %.', NEW."programId", NEW."universityId"
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "application_program_matches_university"
  BEFORE INSERT OR UPDATE OF "programId", "universityId" ON "application"
  FOR EACH ROW EXECUTE FUNCTION "assert_program_belongs_to_university"();

-- ------------------------------------------------------------------ status history

CREATE TABLE "application_status_history" (
  "id"              uuid NOT NULL,
  "applicationId"   uuid NOT NULL,
  "previousStatus"  "application_status",
  "newStatus"       "application_status" NOT NULL,
  "changedByUserId" uuid,
  "note"            text,
  "createdAt"       timestamptz(3) NOT NULL DEFAULT now(),

  CONSTRAINT "application_status_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "application_status_history_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE CASCADE,
  CONSTRAINT "application_status_history_changedByUserId_fkey"
    FOREIGN KEY ("changedByUserId") REFERENCES "user"("id") ON DELETE SET NULL
);

CREATE INDEX "application_status_history_application_created_idx"
  ON "application_status_history" ("applicationId", "createdAt" DESC);

-- Append-only, exactly as `withdrawal_event` is, and for the same reason: this is the
-- record a dispute is settled from, and a trail that can be edited afterwards has no
-- evidential value at all.
CREATE OR REPLACE FUNCTION "application_history_append_only"() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'application_status_history is append-only; % is not permitted. Record a new row instead.',
    TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER "application_status_history_no_update"
  BEFORE UPDATE ON "application_status_history"
  FOR EACH ROW EXECUTE FUNCTION "application_history_append_only"();

CREATE TRIGGER "application_status_history_no_delete"
  BEFORE DELETE ON "application_status_history"
  FOR EACH ROW EXECUTE FUNCTION "application_history_append_only"();

-- ------------------------------------------------------------------ one source of truth
--
-- The audit's second Blocker: `student.stage` already tracked ENQUIRY through REGISTERED,
-- and `application.status` now tracks the same journey in sixteen steps. Two writable
-- columns describing one thing is a guarantee that they will disagree, and the
-- disagreement surfaces as a student being told two different things about their own
-- application.
--
-- Resolved by making `student.stage` **derived**. It stays a column, because the partner
-- and representative portals filter and index on it and a computed value cannot be
-- indexed usefully here. But it is now written by exactly one thing: this trigger, from
-- the application's status. No service writes it, and the mapping lives in one place
-- rather than being reimplemented per portal.
--
-- Where several applications exist for one student, the furthest-advanced wins. A student
-- with a rejected bachelor's application and a live master's one is, correctly, at the
-- master's stage.

CREATE OR REPLACE FUNCTION "student_stage_for_status"(s "application_status")
  RETURNS "student_stage" LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE s
    WHEN 'DRAFT'                  THEN 'ENQUIRY'
    WHEN 'SUBMITTED'              THEN 'DOCUMENTS'
    WHEN 'UNDER_REVIEW'           THEN 'DOCUMENTS'
    WHEN 'DOCUMENTS_REQUIRED'     THEN 'DOCUMENTS'
    WHEN 'DOCUMENTS_REVIEW'       THEN 'DOCUMENTS'
    WHEN 'APPLICATION_PROCESSING' THEN 'SUBMITTED'
    WHEN 'UNIVERSITY_SUBMITTED'   THEN 'SUBMITTED'
    WHEN 'ADMISSION_PENDING'      THEN 'SUBMITTED'
    WHEN 'ADMITTED'               THEN 'OFFER'
    WHEN 'VISA_PROCESS'           THEN 'VISA'
    WHEN 'VISA_APPROVED'          THEN 'VISA'
    WHEN 'READY_FOR_TRAVEL'       THEN 'REGISTERED'
    WHEN 'COMPLETED'              THEN 'REGISTERED'
    -- Terminal refusals do not advance a student and do not reverse them either. The
    -- stage stays wherever their other applications put it.
    ELSE NULL
  END::"student_stage";
$$;

/* Rank so "furthest advanced" is comparable. Mirrors the enum's declared order, which
   Postgres already orders by, but stated explicitly so a future enum value inserted in
   the middle cannot silently reorder the comparison. */
CREATE OR REPLACE FUNCTION "student_stage_rank"(s "student_stage")
  RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE s
    WHEN 'ENQUIRY'    THEN 1
    WHEN 'DOCUMENTS'  THEN 2
    WHEN 'SUBMITTED'  THEN 3
    WHEN 'OFFER'      THEN 4
    WHEN 'VISA'       THEN 5
    WHEN 'REGISTERED' THEN 6
  END;
$$;

CREATE OR REPLACE FUNCTION "sync_student_stage"() RETURNS trigger
  LANGUAGE plpgsql AS $$
DECLARE furthest "student_stage";
BEGIN
  SELECT a_stage INTO furthest
  FROM (
    SELECT "student_stage_for_status"(a."status") AS a_stage
    FROM "application" a
    WHERE a."studentId" = NEW."studentId"
  ) stages
  WHERE a_stage IS NOT NULL
  ORDER BY "student_stage_rank"(a_stage) DESC
  LIMIT 1;

  UPDATE "student"
  SET "stage" = COALESCE(furthest, 'ENQUIRY'), "updatedAt" = now()
  WHERE "id" = NEW."studentId";

  RETURN NEW;
END;
$$;

CREATE TRIGGER "application_syncs_student_stage"
  AFTER INSERT OR UPDATE OF "status" ON "application"
  FOR EACH ROW EXECUTE FUNCTION "sync_student_stage"();
