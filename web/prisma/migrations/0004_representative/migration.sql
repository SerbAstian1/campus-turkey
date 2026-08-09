-- Representatives — brief §12, §23, and the referral half of §16.
--
-- A representative is deliberately not a partner with a flag. §4 is explicit that the
-- two are different relationships, and they are cheapest to keep apart now, while
-- neither has history. Telling them apart later would mean migrating live referral
-- attribution, which is the one thing that must never be guessed at.

-- ------------------------------------------------------------------ enums

CREATE TYPE "representative_status" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED');

CREATE TYPE "application_review_status" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- ------------------------------------------------------------------ profile

CREATE TABLE "representative_profile" (
  "id"               uuid NOT NULL,
  "userId"           uuid NOT NULL,
  "fullName"         text NOT NULL,
  "organizationName" text,
  "country"          text NOT NULL,
  "email"            text NOT NULL,
  "phone"            text,
  "address"          text,
  "territory"        text,
  "status"           "representative_status" NOT NULL DEFAULT 'PENDING',
  "since"            date NOT NULL,
  "createdAt"        timestamptz(3) NOT NULL DEFAULT now(),
  "updatedAt"        timestamptz(3) NOT NULL,

  CONSTRAINT "representative_profile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "representative_profile_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "representative_profile_userId_key" ON "representative_profile" ("userId");
CREATE INDEX "representative_profile_status_idx" ON "representative_profile" ("status");
CREATE INDEX "representative_profile_country_idx" ON "representative_profile" ("country");

-- The same guarantee the partner table got in 0003, for the same reason: a profile that
-- confers a role must belong to a user who holds that role, or the role means nothing.
CREATE OR REPLACE FUNCTION "assert_representative_user_role"() RETURNS trigger
  LANGUAGE plpgsql AS $$
DECLARE holder_role "user_role";
BEGIN
  SELECT "role" INTO holder_role FROM "user" WHERE "id" = NEW."userId";
  IF holder_role IS DISTINCT FROM 'REPRESENTATIVE' THEN
    RAISE EXCEPTION
      'A representative profile may only belong to a user whose role is REPRESENTATIVE (user % has role %).',
      NEW."userId", holder_role
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "representative_user_must_be_representative"
  BEFORE INSERT OR UPDATE OF "userId" ON "representative_profile"
  FOR EACH ROW EXECUTE FUNCTION "assert_representative_user_role"();

-- ------------------------------------------------------------------ application

CREATE TABLE "representative_application" (
  "id"               uuid NOT NULL,
  "fullName"         text NOT NULL,
  "organizationName" text,
  "country"          text NOT NULL,
  "territory"        text,
  "email"            text NOT NULL,
  "phone"            text,
  "address"          text,
  "message"          text,
  "status"           "application_review_status" NOT NULL DEFAULT 'PENDING',
  "reviewedByUserId" uuid,
  "reviewedAt"       timestamptz(3),
  "reviewNote"       text,
  "createdAt"        timestamptz(3) NOT NULL DEFAULT now(),
  "updatedAt"        timestamptz(3) NOT NULL,

  CONSTRAINT "representative_application_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "representative_application_reviewedByUserId_fkey"
    FOREIGN KEY ("reviewedByUserId") REFERENCES "user"("id") ON DELETE SET NULL
);

CREATE INDEX "representative_application_status_created_idx"
  ON "representative_application" ("status", "createdAt" DESC);
CREATE INDEX "representative_application_email_idx"
  ON "representative_application" ("email");

-- One *live* application per address. A rejected applicant may apply again, and a
-- previously approved one must not create a second account by re-submitting the form.
-- A plain unique index would forbid both; this forbids only the duplicate that matters.
CREATE UNIQUE INDEX "representative_application_one_open_per_email"
  ON "representative_application" ("email")
  WHERE "status" IN ('PENDING', 'UNDER_REVIEW');

-- A decision must record who made it and when. Enforced rather than trusted, because
-- this is the row someone reads when an applicant disputes a rejection months later.
ALTER TABLE "representative_application"
  ADD CONSTRAINT "representative_application_decision_is_attributed"
  CHECK (
    "status" IN ('PENDING', 'UNDER_REVIEW')
    OR ("reviewedByUserId" IS NOT NULL AND "reviewedAt" IS NOT NULL)
  );

-- ------------------------------------------------------------------ referral on student
--
-- §16 places referral attribution on the application, and it will live there once
-- `Application` exists. `student` carries it in the meantime because a representative
-- has to be able to refer somebody before there is an application object to hang it on,
-- and a portal with no possible content cannot be tested.

ALTER TABLE "student" ADD COLUMN "representativeId" uuid;

ALTER TABLE "student"
  ADD CONSTRAINT "student_representativeId_fkey"
  FOREIGN KEY ("representativeId") REFERENCES "representative_profile"("id") ON DELETE RESTRICT;

-- Every existing student was referred by a partner, so this is safe today. It is done
-- before the CHECK below, which would otherwise reject every existing row.
ALTER TABLE "student" ALTER COLUMN "partnerId" DROP NOT NULL;

-- §16's invariant: no referral, or exactly one. Never both.
--
-- Both would mean two parties credited for the same student, and the first time that
-- matters is when somebody is paid twice for one registration.
ALTER TABLE "student"
  ADD CONSTRAINT "student_referral_is_exclusive"
  CHECK (NOT ("partnerId" IS NOT NULL AND "representativeId" IS NOT NULL));

CREATE INDEX "student_representative_updated_idx"
  ON "student" ("representativeId", "updatedAt" DESC);
CREATE INDEX "student_representative_stage_idx"
  ON "student" ("representativeId", "stage");

-- ------------------------------------------------------------------ commission safety
--
-- `commission` reaches `student` through the composite key (id, partnerId), and
-- `commission.partnerId` is NOT NULL, so a commission can only ever resolve to a student
-- who has a partner. That is the behaviour we want and it now holds by construction
-- rather than by convention: a representative-referred student has a NULL partnerId and
-- therefore cannot be given a commission at all.
--
-- Asserted here so the guarantee is checked at migration time rather than assumed.

DO $$
DECLARE orphaned integer;
BEGIN
  SELECT count(*) INTO orphaned
  FROM "commission" c
  JOIN "student" s ON s."id" = c."studentId"
  WHERE s."partnerId" IS NULL;

  IF orphaned > 0 THEN
    RAISE EXCEPTION
      '% commission row(s) reference a student with no partner. The composite foreign key should have made this impossible.',
      orphaned;
  END IF;
END;
$$;
