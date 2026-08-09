-- Retire `staff_role`.
--
-- Added in 0003 alongside `user_role` and deliberately kept, so that the backfill had a
-- source to read and endpoints could move to the permission layer one at a time. Both
-- are now done: no code reads the column, every endpoint states a capability, and the
-- distinction it carried lives in `staff_profile.department`.
--
-- Dropping it in 0003 would have meant a deploy window where already-running code read a
-- column that no longer existed. Dropping it now is safe for the same reason it was
-- unsafe then: the order was chosen rather than convenient.

-- Every staff account must have a profile before the column goes, because the department
-- on that profile is what now grants the money permissions. A FINANCE user without one
-- would silently lose the ability to approve payouts, and it would present as a
-- permissions bug rather than as a missing row.
DO $$
DECLARE orphaned integer;
BEGIN
  SELECT count(*) INTO orphaned
  FROM "user" u
  LEFT JOIN "staff_profile" p ON p."userId" = u."id"
  WHERE u."role" IN ('STAFF', 'ADMIN', 'SUPER_ADMIN')
    AND p."id" IS NULL;

  IF orphaned > 0 THEN
    RAISE EXCEPTION
      '% staff account(s) have no staff_profile. Create one for each before dropping staff_role, or they lose their department and its permissions.',
      orphaned;
  END IF;
END;
$$;

-- The department must still agree with the role it replaced. This is the last moment the
-- old column exists to check against, so the assertion is made here rather than trusted.
DO $$
DECLARE mismatched integer;
BEGIN
  SELECT count(*) INTO mismatched
  FROM "user" u
  JOIN "staff_profile" p ON p."userId" = u."id"
  WHERE u."staffRole" = 'FINANCE' AND p."department" <> 'FINANCE';

  IF mismatched > 0 THEN
    RAISE EXCEPTION
      '% user(s) had staffRole FINANCE but their profile department is not FINANCE. They would lose payout permissions.',
      mismatched;
  END IF;
END;
$$;

ALTER TABLE "user" DROP COLUMN "staffRole";

DROP TYPE "staff_role";
