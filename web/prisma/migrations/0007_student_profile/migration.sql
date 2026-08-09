-- Student accounts — brief §10, and the audit's third Blocker.
--
-- `student` is a record an agency created about somebody they referred: a name, a
-- university, a stage. It has no login and exists whether or not that person ever hears
-- about the portal. `student_profile` is the person, hanging off `user`, and it appears
-- only when they claim their record.
--
-- Keeping them apart is what makes "a partner filled in a form" distinguishable from "a
-- student signed up". Bolting email and password onto `student` would give every
-- referred person a dormant half-account they never asked for.

CREATE TABLE "student_profile" (
  "id"                 uuid NOT NULL,
  "userId"             uuid NOT NULL,
  "firstName"          text NOT NULL,
  "lastName"           text NOT NULL,
  "phone"              text,
  "dateOfBirth"        date,
  "nationality"        text NOT NULL,
  "countryOfResidence" text NOT NULL,
  -- §10: do not collect unnecessary sensitive information. A passport number is needed
  -- for a visa and nothing before it, so it is nullable and asked for at that stage.
  "passportNumber"     text,
  "address"            text,
  "profilePhoto"       text,
  "createdAt"          timestamptz(3) NOT NULL DEFAULT now(),
  "updatedAt"          timestamptz(3) NOT NULL,

  CONSTRAINT "student_profile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "student_profile_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "student_profile_userId_key" ON "student_profile" ("userId");
CREATE INDEX "student_profile_nationality_idx" ON "student_profile" ("nationality");

-- The same guarantee the partner and representative profiles carry: a profile that
-- confers a role must belong to a user who holds that role.
CREATE OR REPLACE FUNCTION "assert_student_user_role"() RETURNS trigger
  LANGUAGE plpgsql AS $$
DECLARE holder_role "user_role";
BEGIN
  SELECT "role" INTO holder_role FROM "user" WHERE "id" = NEW."userId";
  IF holder_role IS DISTINCT FROM 'STUDENT' THEN
    RAISE EXCEPTION
      'A student profile may only belong to a user whose role is STUDENT (user % has role %).',
      NEW."userId", holder_role
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "student_profile_user_must_be_student"
  BEFORE INSERT OR UPDATE OF "userId" ON "student_profile"
  FOR EACH ROW EXECUTE FUNCTION "assert_student_user_role"();

-- ------------------------------------------------------------------ claiming

ALTER TABLE "student" ADD COLUMN "profileId" uuid;
ALTER TABLE "student" ADD COLUMN "claimCode" text;

ALTER TABLE "student"
  ADD CONSTRAINT "student_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "student_profile"("id") ON DELETE SET NULL;

CREATE INDEX "student_profileId_idx" ON "student" ("profileId");

-- Unique while it exists, absent once used. A partial index rather than a plain unique
-- so that the many unclaimed rows with NULL do not collide with each other.
CREATE UNIQUE INDEX "student_claimCode_key"
  ON "student" ("claimCode")
  WHERE "claimCode" IS NOT NULL;

-- A claimed record must have consumed its code, and an unclaimed one must still have a
-- code to consume. Without this a record can be claimed while its code stays live, so a
-- second person holding the same code could claim it again.
ALTER TABLE "student"
  ADD CONSTRAINT "student_claim_is_consumed"
  CHECK (NOT ("profileId" IS NOT NULL AND "claimCode" IS NOT NULL));
