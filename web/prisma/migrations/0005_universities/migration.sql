-- Universities and programmes as records — brief §14, §15.
--
-- The directory has been a TypeScript array since the prototype. §44 needs server-side
-- filtering and §49 needs admin CRUD, and neither is possible against a source file.
--
-- Nothing is dropped here. `src/content/universities.ts` stays until the pages read from
-- the API, so the two can be compared and the migration is reversible by not deploying
-- the page change.

CREATE TYPE "university_type" AS ENUM ('PUBLIC', 'PRIVATE');
CREATE TYPE "publish_status" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "degree_level" AS ENUM ('FOUNDATION', 'BACHELOR', 'MASTER', 'PHD');

CREATE TABLE "university" (
  "id"              uuid NOT NULL,
  "slug"            text NOT NULL,
  "name"            text NOT NULL,
  "city"            text NOT NULL,
  "region"          text,
  "type"            "university_type" NOT NULL,
  "description"     text NOT NULL,
  "logo"            text,
  "coverImage"      text,
  "website"         text,
  "latitude"        double precision,
  "longitude"       double precision,
  "status"          "publish_status" NOT NULL DEFAULT 'PUBLISHED',
  "languages"       text[] NOT NULL DEFAULT '{}',
  "tuitionDisplay"  text NOT NULL,
  "programCount"    integer NOT NULL DEFAULT 0,
  "scholarship"     boolean NOT NULL DEFAULT false,
  "founded"         integer,
  "studentsDisplay" text,
  "ranking"         text,
  "faculties"       text[] NOT NULL DEFAULT '{}',
  "deadlines"       jsonb,
  "createdAt"       timestamptz(3) NOT NULL DEFAULT now(),
  "updatedAt"       timestamptz(3) NOT NULL,

  CONSTRAINT "university_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "university_slug_key" ON "university" ("slug");
CREATE INDEX "university_status_city_idx" ON "university" ("status", "city");
CREATE INDEX "university_status_type_idx" ON "university" ("status", "type");
CREATE INDEX "university_city_type_idx" ON "university" ("city", "type");

-- Free-text search across name and city, which is what the directory's search box does.
-- A trigram index rather than tsvector: the box is used for partial names ("bogaz",
-- "istan"), and full-text search matches whole lexemes, so it would find nothing for
-- exactly the input people type.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "university_name_trgm_idx" ON "university" USING gin ("name" gin_trgm_ops);
CREATE INDEX "university_city_trgm_idx" ON "university" USING gin ("city" gin_trgm_ops);

CREATE TABLE "program" (
  "id"                   uuid NOT NULL,
  "universityId"         uuid NOT NULL,
  "name"                 text NOT NULL,
  "slug"                 text NOT NULL,
  "degreeLevel"          "degree_level" NOT NULL,
  "language"             text NOT NULL,
  "duration"             text,
  "tuitionMinor"         integer,
  "currency"             char(3),
  "scholarshipAvailable" boolean NOT NULL DEFAULT false,
  "description"          text,
  "status"               "publish_status" NOT NULL DEFAULT 'PUBLISHED',
  "createdAt"            timestamptz(3) NOT NULL DEFAULT now(),
  "updatedAt"            timestamptz(3) NOT NULL,

  CONSTRAINT "program_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "program_universityId_fkey"
    FOREIGN KEY ("universityId") REFERENCES "university"("id") ON DELETE CASCADE
);

-- Unique per university rather than globally: "Medicine" exists at forty institutions.
CREATE UNIQUE INDEX "program_universityId_slug_key" ON "program" ("universityId", "slug");
CREATE INDEX "program_universityId_idx" ON "program" ("universityId");
CREATE INDEX "program_status_degreeLevel_idx" ON "program" ("status", "degreeLevel");
CREATE INDEX "program_status_language_idx" ON "program" ("status", "language");
CREATE INDEX "program_tuitionMinor_idx" ON "program" ("tuitionMinor");

-- Money is an integer count of minor units everywhere in this schema, and a fee of zero
-- is a claim rather than an absence. Nullable and positive, never zero.
ALTER TABLE "program"
  ADD CONSTRAINT "program_tuition_is_positive"
  CHECK ("tuitionMinor" IS NULL OR "tuitionMinor" > 0);

-- A fee without a currency is unreadable, and a currency without a fee is noise.
ALTER TABLE "program"
  ADD CONSTRAINT "program_tuition_has_currency"
  CHECK (("tuitionMinor" IS NULL) = ("currency" IS NULL));
