-- Documents — brief §18, §83.
--
-- The row is the record; the bytes live in object storage. §18 is explicit that raw
-- uploads do not belong in Postgres, and `storageKey` is the only link to them. A
-- database dump handed to a developer therefore contains passport *metadata* and no
-- passports.

CREATE TYPE "document_type" AS ENUM (
  'PASSPORT', 'PHOTOGRAPH', 'HIGH_SCHOOL_DIPLOMA', 'HIGH_SCHOOL_TRANSCRIPT',
  'BACHELOR_DIPLOMA', 'BACHELOR_TRANSCRIPT', 'LANGUAGE_CERTIFICATE',
  'FINANCIAL_STATEMENT', 'MEDICAL_REPORT', 'OTHER'
);

CREATE TYPE "document_status" AS ENUM (
  'PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'REQUIRES_REUPLOAD'
);

CREATE TABLE "document" (
  "id"               uuid NOT NULL,
  "applicationId"    uuid NOT NULL,
  "uploadedByUserId" uuid,
  "type"             "document_type" NOT NULL,
  "fileName"         text NOT NULL,
  "storageKey"       text NOT NULL,
  "mimeType"         text NOT NULL,
  "fileSize"         integer NOT NULL,
  "status"           "document_status" NOT NULL DEFAULT 'PENDING',
  "rejectionReason"  text,
  "reviewedByUserId" uuid,
  "reviewedAt"       timestamptz(3),
  "uploadedAt"       timestamptz(3),
  "createdAt"        timestamptz(3) NOT NULL DEFAULT now(),
  "updatedAt"        timestamptz(3) NOT NULL,

  CONSTRAINT "document_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "document_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE CASCADE,
  CONSTRAINT "document_uploadedByUserId_fkey"
    FOREIGN KEY ("uploadedByUserId") REFERENCES "user"("id") ON DELETE SET NULL,
  CONSTRAINT "document_reviewedByUserId_fkey"
    FOREIGN KEY ("reviewedByUserId") REFERENCES "user"("id") ON DELETE SET NULL
);

CREATE UNIQUE INDEX "document_storageKey_key" ON "document" ("storageKey");
CREATE INDEX "document_application_created_idx" ON "document" ("applicationId", "createdAt" DESC);
CREATE INDEX "document_status_created_idx" ON "document" ("status", "createdAt" DESC);

-- The size limits from §83, in the database as well as in the service. The service
-- refuses first with a readable message; this catches anything that reached an insert
-- another way, which is what a constraint is for.
ALTER TABLE "document"
  ADD CONSTRAINT "document_size_is_plausible"
  CHECK ("fileSize" > 0 AND "fileSize" <= 12582912);

-- A rejection must say why. This is the sentence the applicant is shown, and a rejection
-- without one leaves them with a refused document and no idea what to change.
ALTER TABLE "document"
  ADD CONSTRAINT "document_rejection_has_a_reason"
  CHECK (
    "status" NOT IN ('REJECTED', 'REQUIRES_REUPLOAD')
    OR ("rejectionReason" IS NOT NULL AND length(btrim("rejectionReason")) > 0)
  );

-- A decision must record who made it and when, for the same reason the representative
-- application does: this row is read when a decision is questioned months later.
ALTER TABLE "document"
  ADD CONSTRAINT "document_decision_is_attributed"
  CHECK (
    "status" IN ('PENDING', 'UNDER_REVIEW')
    OR ("reviewedByUserId" IS NOT NULL AND "reviewedAt" IS NOT NULL)
  );

-- A document cannot be reviewed before it has finished uploading. Without this a
-- presigned URL that was issued and abandoned can be approved, and the approval refers
-- to a file that does not exist.
ALTER TABLE "document"
  ADD CONSTRAINT "document_reviewed_only_after_upload"
  CHECK ("status" = 'PENDING' OR "uploadedAt" IS NOT NULL);

-- The storage key is generated server-side from a uuid. This refuses anything that could
-- escape its prefix, so a traversal attempt cannot be stored even if the generator were
-- one day changed to accept input.
ALTER TABLE "document"
  ADD CONSTRAINT "document_storage_key_is_scoped"
  CHECK (
    "storageKey" LIKE 'applications/%'
    AND position('..' in "storageKey") = 0
    AND position('\' in "storageKey") = 0
  );
