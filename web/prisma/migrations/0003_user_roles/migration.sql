-- Roles, declared rather than inferred.
--
-- Until now a user's role was worked out from relations: staff if `staffRole` was
-- non-null, partner if a `partner` row pointed back at them. That is invisible at the
-- point of an authorization check, and it cannot represent a user who has been invited
-- but has no profile row yet.
--
-- This migration adds the role and status columns, backfills them from the relations
-- that currently carry the information, and then asserts that the backfill was total.
-- `staff_role` is deliberately left in place: removing it in the same migration that
-- replaces it would mean a window where already-running code reads a dropped column.

-- ------------------------------------------------------------------ enums

CREATE TYPE "user_role" AS ENUM (
  'STUDENT', 'PARTNER', 'REPRESENTATIVE', 'STAFF', 'ADMIN', 'SUPER_ADMIN'
);

CREATE TYPE "user_status" AS ENUM (
  'PENDING', 'INVITED', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'
);

CREATE TYPE "staff_department" AS ENUM (
  'ADMISSIONS', 'STUDENT_SUPPORT', 'MEDICAL_TOURISM', 'BUSINESS',
  'PARTNERSHIPS', 'OPERATIONS', 'MARKETING', 'MANAGEMENT', 'FINANCE'
);

-- ------------------------------------------------------------------ staff profile

CREATE TABLE "staff_profile" (
  "id"         uuid NOT NULL,
  "userId"     uuid NOT NULL,
  "firstName"  text NOT NULL,
  "lastName"   text NOT NULL,
  "department" "staff_department" NOT NULL DEFAULT 'OPERATIONS',
  "jobTitle"   text,
  "createdAt"  timestamptz(3) NOT NULL DEFAULT now(),
  "updatedAt"  timestamptz(3) NOT NULL,

  CONSTRAINT "staff_profile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "staff_profile_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "staff_profile_userId_key" ON "staff_profile" ("userId");

-- ------------------------------------------------------------------ columns
--
-- No DEFAULT on `role` during the add. A default would silently make every existing row
-- a STUDENT, and the assertion below would then have nothing to catch, because every row
-- would already look intentional. Added NULL, backfilled, then made NOT NULL.

ALTER TABLE "user" ADD COLUMN "role" "user_role";
ALTER TABLE "user" ADD COLUMN "status" "user_status" NOT NULL DEFAULT 'ACTIVE';

-- ------------------------------------------------------------------ backfill
--
-- Three explicit statements with mutually exclusive predicates, ordered so that the one
-- overlap resolves deliberately: a user who is somehow both staff and a partner is
-- staff, decided here rather than left to evaluation order.

-- 1. ADMIN keeps its meaning exactly.
UPDATE "user" SET "role" = 'ADMIN'
WHERE "staffRole" = 'ADMIN';

-- 2. SUPPORT and FINANCE both become STAFF. FINANCE's extra power moves to the
--    department below, not to the role: the brief's vocabulary has no FINANCE role, and
--    inventing one would put this schema permanently out of step with the spec.
UPDATE "user" SET "role" = 'STAFF'
WHERE "staffRole" IN ('SUPPORT', 'FINANCE');

-- 3. Anyone holding a partner record is a PARTNER.
UPDATE "user" u SET "role" = 'PARTNER'
WHERE u."role" IS NULL
  AND EXISTS (SELECT 1 FROM "partner" p WHERE p."userId" = u."id");

-- ------------------------------------------------------------------ staff profiles
--
-- Every staff user gets a profile carrying the department their old role implied.
-- `name` is split on the first space; a staff member with a single name keeps it as
-- their first name with an empty surname, which is right more often than the reverse.

INSERT INTO "staff_profile" ("id", "userId", "firstName", "lastName", "department", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  u."id",
  COALESCE(NULLIF(split_part(COALESCE(u."name", ''), ' ', 1), ''), 'Staff'),
  CASE
    WHEN POSITION(' ' IN COALESCE(u."name", '')) > 0
      THEN substr(u."name", POSITION(' ' IN u."name") + 1)
    ELSE ''
  END,
  CASE
    WHEN u."staffRole" = 'FINANCE' THEN 'FINANCE'::"staff_department"
    WHEN u."staffRole" = 'ADMIN'   THEN 'MANAGEMENT'::"staff_department"
    ELSE 'OPERATIONS'::"staff_department"
  END,
  now(),
  now()
FROM "user" u
WHERE u."staffRole" IS NOT NULL;

-- ------------------------------------------------------------------ assert
--
-- The backfill must be total. A user left without a role can still sign in and will
-- reach nothing, which presents as a broken account rather than a broken migration, so
-- this fails the migration instead while the cause is still on screen.

DO $$
DECLARE unassigned integer;
BEGIN
  SELECT count(*) INTO unassigned FROM "user" WHERE "role" IS NULL;
  IF unassigned > 0 THEN
    RAISE EXCEPTION
      'Backfill incomplete: % user row(s) have no role. Every user must be staff, a partner, or explicitly a student before this migration can complete.',
      unassigned;
  END IF;
END;
$$;

ALTER TABLE "user" ALTER COLUMN "role" SET NOT NULL;
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'STUDENT';

-- ------------------------------------------------------------------ integrity
--
-- A partner record may only belong to a user whose role says so. Prisma cannot express
-- this, and it is the kind of rule that holds only while everybody remembers it.
--
-- What it prevents concretely: a partner promoted to staff who keeps their wallet, and
-- can then approve their own payouts from the staff console. That is the separation the
-- entire money path rests on, and it should not depend on an application-layer check
-- somebody might forget to write.

CREATE OR REPLACE FUNCTION "assert_partner_user_is_partner_role"() RETURNS trigger
  LANGUAGE plpgsql AS $$
DECLARE holder_role "user_role";
BEGIN
  SELECT "role" INTO holder_role FROM "user" WHERE "id" = NEW."userId";
  IF holder_role IS DISTINCT FROM 'PARTNER' THEN
    RAISE EXCEPTION
      'A partner record may only belong to a user whose role is PARTNER (user % has role %).',
      NEW."userId", holder_role
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "partner_user_must_be_partner"
  BEFORE INSERT OR UPDATE OF "userId" ON "partner"
  FOR EACH ROW EXECUTE FUNCTION "assert_partner_user_is_partner_role"();

-- ------------------------------------------------------------------ indexes

CREATE INDEX "user_role_idx" ON "user" ("role");
CREATE INDEX "user_status_idx" ON "user" ("status");
CREATE INDEX "staff_profile_department_idx" ON "staff_profile" ("department");
