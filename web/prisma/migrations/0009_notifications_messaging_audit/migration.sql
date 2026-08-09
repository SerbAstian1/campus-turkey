-- Notifications, messaging and the audit log — brief §24, §25, §26.

CREATE TYPE "notification_type" AS ENUM (
  'APPLICATION_STATUS', 'DOCUMENT_REQUESTED', 'DOCUMENT_REVIEWED',
  'MESSAGE_RECEIVED', 'ACCOUNT', 'PAYOUT'
);

CREATE TABLE "notification" (
  "id"        uuid NOT NULL,
  "userId"    uuid NOT NULL,
  "type"      "notification_type" NOT NULL,
  "title"     text NOT NULL,
  "body"      text NOT NULL,
  "href"      text,
  "readAt"    timestamptz(3),
  "createdAt" timestamptz(3) NOT NULL DEFAULT now(),

  CONSTRAINT "notification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
);

-- The unread badge and the full list are the same query with and without a filter, so
-- one composite index serves both.
CREATE INDEX "notification_user_read_created_idx"
  ON "notification" ("userId", "readAt", "createdAt" DESC);

-- A relative path only. An absolute URL would carry whatever origin happened to be
-- configured when the row was written, and survive a domain change as a dead link.
ALTER TABLE "notification"
  ADD CONSTRAINT "notification_href_is_relative"
  CHECK ("href" IS NULL OR "href" LIKE '/%');

-- ------------------------------------------------------------------ messaging

CREATE TABLE "conversation" (
  "id"            uuid NOT NULL,
  "applicationId" uuid,
  "subject"       text,
  "internal"      boolean NOT NULL DEFAULT false,
  "createdAt"     timestamptz(3) NOT NULL DEFAULT now(),
  "updatedAt"     timestamptz(3) NOT NULL,

  CONSTRAINT "conversation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "conversation_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE CASCADE
);

CREATE INDEX "conversation_application_internal_idx"
  ON "conversation" ("applicationId", "internal", "updatedAt" DESC);

CREATE TABLE "conversation_participant" (
  "conversationId" uuid NOT NULL,
  "userId"         uuid NOT NULL,
  "lastReadAt"     timestamptz(3),
  "createdAt"      timestamptz(3) NOT NULL DEFAULT now(),

  CONSTRAINT "conversation_participant_pkey" PRIMARY KEY ("conversationId", "userId"),
  CONSTRAINT "conversation_participant_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "conversation"("id") ON DELETE CASCADE,
  CONSTRAINT "conversation_participant_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE INDEX "conversation_participant_userId_idx" ON "conversation_participant" ("userId");

CREATE TABLE "message" (
  "id"             uuid NOT NULL,
  "conversationId" uuid NOT NULL,
  "senderId"       uuid NOT NULL,
  "body"           text NOT NULL,
  "createdAt"      timestamptz(3) NOT NULL DEFAULT now(),

  CONSTRAINT "message_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "message_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "conversation"("id") ON DELETE CASCADE,
  CONSTRAINT "message_senderId_fkey"
    FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE INDEX "message_conversation_created_idx" ON "message" ("conversationId", "createdAt" DESC);

ALTER TABLE "message"
  ADD CONSTRAINT "message_body_is_not_empty"
  CHECK (length(btrim("body")) > 0);

-- §25: students must not have unrestricted access to internal staff conversations.
--
-- The guarantee is that an internal thread can only *contain* staff. Enforced here rather
-- than by a filter on every read, because a filter is a thing each new query has to
-- remember and this is a thing the database will not permit.
--
-- Checked on both sides: adding a non-staff participant to an internal thread, and
-- flipping an existing thread to internal while a non-staff participant is in it. The
-- second is the one a filter-based design almost always misses.

CREATE OR REPLACE FUNCTION "assert_internal_conversation_is_staff_only"() RETURNS trigger
  LANGUAGE plpgsql AS $$
DECLARE is_internal boolean;
DECLARE joiner_role "user_role";
BEGIN
  SELECT c."internal" INTO is_internal FROM "conversation" c WHERE c."id" = NEW."conversationId";
  IF NOT is_internal THEN RETURN NEW; END IF;

  SELECT u."role" INTO joiner_role FROM "user" u WHERE u."id" = NEW."userId";

  IF joiner_role NOT IN ('STAFF', 'ADMIN', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION
      'An internal conversation may only include staff (user % has role %).',
      NEW."userId", joiner_role
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "internal_conversation_participants_are_staff"
  BEFORE INSERT OR UPDATE ON "conversation_participant"
  FOR EACH ROW EXECUTE FUNCTION "assert_internal_conversation_is_staff_only"();

CREATE OR REPLACE FUNCTION "assert_conversation_can_become_internal"() RETURNS trigger
  LANGUAGE plpgsql AS $$
DECLARE outsiders integer;
BEGIN
  IF NEW."internal" IS NOT TRUE OR OLD."internal" IS TRUE THEN RETURN NEW; END IF;

  SELECT count(*) INTO outsiders
  FROM "conversation_participant" p
  JOIN "user" u ON u."id" = p."userId"
  WHERE p."conversationId" = NEW."id"
    AND u."role" NOT IN ('STAFF', 'ADMIN', 'SUPER_ADMIN');

  IF outsiders > 0 THEN
    RAISE EXCEPTION
      'This conversation cannot be made internal: % participant(s) are not staff. Remove them first.',
      outsiders
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "conversation_internal_flag_is_safe"
  BEFORE UPDATE OF "internal" ON "conversation"
  FOR EACH ROW EXECUTE FUNCTION "assert_conversation_can_become_internal"();

-- ------------------------------------------------------------------ audit log

CREATE TABLE "audit_log" (
  "id"          uuid NOT NULL,
  "actorUserId" uuid,
  "action"      text NOT NULL,
  "entityType"  text NOT NULL,
  "entityId"    text,
  "metadata"    jsonb,
  "ipPrefix"    text,
  "createdAt"   timestamptz(3) NOT NULL DEFAULT now(),

  CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "audit_log_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE SET NULL
);

CREATE INDEX "audit_log_entity_idx" ON "audit_log" ("entityType", "entityId", "createdAt" DESC);
CREATE INDEX "audit_log_actor_idx" ON "audit_log" ("actorUserId", "createdAt" DESC);
CREATE INDEX "audit_log_action_idx" ON "audit_log" ("action", "createdAt" DESC);

-- Append-only, for the same reason as every other trail in this schema: a record that
-- can be edited after the fact settles no argument.
CREATE OR REPLACE FUNCTION "audit_log_append_only"() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'audit_log is append-only; % is not permitted.', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER "audit_log_no_update"
  BEFORE UPDATE ON "audit_log"
  FOR EACH ROW EXECUTE FUNCTION "audit_log_append_only"();

CREATE TRIGGER "audit_log_no_delete"
  BEFORE DELETE ON "audit_log"
  FOR EACH ROW EXECUTE FUNCTION "audit_log_append_only"();

-- §26's prohibition, enforced rather than trusted.
--
-- The service redacts these keys before writing, and this refuses the row if one ever
-- arrives anyway. An audit log is the most durable place a leaked secret can land: it is
-- append-only by design, so a mistake here cannot be deleted afterwards.
ALTER TABLE "audit_log"
  ADD CONSTRAINT "audit_log_carries_no_secrets"
  CHECK (
    "metadata" IS NULL
    OR NOT (
      "metadata" ?| ARRAY[
        'password', 'passwordHash', 'token', 'sessionToken', 'accessToken',
        'refreshToken', 'resetToken', 'claimCode', 'otp', 'secret',
        'apiKey', 'authorization', 'cookie'
      ]
    )
  );
