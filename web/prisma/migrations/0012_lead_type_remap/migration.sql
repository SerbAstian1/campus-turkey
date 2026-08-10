-- Remap `APPLY` to `STUDY`.
--
-- A separate migration from 0011 for a reason that is a Postgres rule rather than a
-- preference: a value added by `ALTER TYPE ... ADD VALUE` cannot be *used* until the
-- transaction that added it commits. Written into 0011 this would fail with "unsafe use
-- of new value of enum type", and it would fail on the client's database rather than on
-- this machine, because the migration that broke it would already have been applied.
--
-- This is the second half of the additive rename. Add the value, ship it, then move the
-- rows — never rename in place, where a deploy that fails between the two leaves rows
-- pointing at a value that no longer exists.

UPDATE "inquiry" SET "type" = 'STUDY' WHERE "type" = 'APPLY';
UPDATE "lead"    SET "kind" = 'STUDY' WHERE "kind" = 'APPLY';

-- `APPLY` stays in the type after this. Removing an enum value means creating a new type,
-- rewriting every column that uses it, and recreating every dependent index — a table
-- rewrite and an exclusive lock, to delete a word no row uses. The application will not
-- write it (`leadTypes` in the service layer is the writable list), and this assertion is
-- what keeps that true rather than merely intended.
DO $$
DECLARE stragglers integer;
BEGIN
  SELECT count(*) INTO stragglers
  FROM (
    SELECT 1 FROM "lead"    WHERE "kind" = 'APPLY'
    UNION ALL
    SELECT 1 FROM "inquiry" WHERE "type" = 'APPLY'
  ) s;

  IF stragglers > 0 THEN
    RAISE EXCEPTION '% row(s) still carry the deprecated APPLY value after the remap.', stragglers;
  END IF;
END;
$$;
