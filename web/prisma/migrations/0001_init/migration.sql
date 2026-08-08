-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "staff_role" AS ENUM ('SUPPORT', 'FINANCE', 'ADMIN');

-- CreateEnum
CREATE TYPE "partner_status" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "student_stage" AS ENUM ('ENQUIRY', 'DOCUMENTS', 'SUBMITTED', 'OFFER', 'VISA', 'REGISTERED');

-- CreateEnum
CREATE TYPE "commission_state" AS ENUM ('PENDING', 'CONFIRMED', 'REVERSED');

-- CreateEnum
CREATE TYPE "payout_method_kind" AS ENUM ('BANK', 'WISE', 'STABLECOIN', 'MOBILE_MONEY');

-- CreateEnum
CREATE TYPE "withdrawal_status" AS ENUM ('REQUESTED', 'APPROVED', 'PROCESSING', 'PAID', 'REJECTED');

-- CreateEnum
CREATE TYPE "lead_kind" AS ENUM ('APPLY', 'CONTACT', 'PARTNER', 'REPRESENTATIVE', 'MEDICAL');

-- CreateEnum
CREATE TYPE "lead_status" AS ENUM ('NEW', 'CONTACTED', 'CONVERTED', 'CLOSED');

-- CreateTable
CREATE TABLE "user" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT,
    "image" TEXT,
    "staffRole" "staff_role",
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMPTZ(3),
    "refreshTokenExpiresAt" TIMESTAMPTZ(3),
    "scope" TEXT,
    "idToken" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" UUID NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "org" TEXT NOT NULL,
    "person" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "territory" TEXT NOT NULL,
    "managerName" TEXT NOT NULL,
    "managerRole" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "minimumMinor" INTEGER NOT NULL DEFAULT 20000,
    "status" "partner_status" NOT NULL DEFAULT 'ACTIVE',
    "since" DATE NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student" (
    "id" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "universitySlug" TEXT NOT NULL,
    "universityName" TEXT NOT NULL,
    "program" TEXT NOT NULL,
    "stage" "student_stage" NOT NULL DEFAULT 'ENQUIRY',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "state" "commission_state" NOT NULL DEFAULT 'PENDING',
    "basis" TEXT NOT NULL,
    "period" VARCHAR(7) NOT NULL,
    "confirmedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "commission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_method" (
    "id" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "kind" "payout_method_kind" NOT NULL,
    "label" TEXT NOT NULL,
    "maskedDetail" TEXT NOT NULL,
    "providerToken" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "speed" TEXT NOT NULL,
    "fee" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payout_method_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawal" (
    "id" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "payoutMethodId" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "status" "withdrawal_status" NOT NULL DEFAULT 'REQUESTED',
    "period" TEXT NOT NULL,
    "basis" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "providerRef" TEXT,
    "requestedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "withdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawal_event" (
    "id" UUID NOT NULL,
    "withdrawalId" UUID NOT NULL,
    "fromStatus" "withdrawal_status",
    "toStatus" "withdrawal_status" NOT NULL,
    "actorUserId" UUID,
    "note" TEXT,
    "at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "withdrawal_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead" (
    "id" UUID NOT NULL,
    "kind" "lead_kind" NOT NULL,
    "payload" JSONB NOT NULL,
    "email" TEXT NOT NULL,
    "consentAt" TIMESTAMPTZ(3) NOT NULL,
    "retentionUntil" TIMESTAMPTZ(3) NOT NULL,
    "status" "lead_status" NOT NULL DEFAULT 'NEW',
    "ipPrefix" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "session_expiresAt_idx" ON "session"("expiresAt");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "account_providerId_accountId_key" ON "account"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE INDEX "verification_expiresAt_idx" ON "verification"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "partner_userId_key" ON "partner"("userId");

-- CreateIndex
CREATE INDEX "partner_status_idx" ON "partner"("status");

-- CreateIndex
CREATE UNIQUE INDEX "partner_id_currency_key" ON "partner"("id", "currency");

-- CreateIndex
CREATE INDEX "student_partnerId_updatedAt_idx" ON "student"("partnerId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "student_partnerId_stage_idx" ON "student"("partnerId", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "student_id_partnerId_key" ON "student"("id", "partnerId");

-- CreateIndex
CREATE INDEX "commission_partnerId_state_idx" ON "commission"("partnerId", "state");

-- CreateIndex
CREATE INDEX "commission_studentId_idx" ON "commission"("studentId");

-- CreateIndex
CREATE INDEX "payout_method_partnerId_archivedAt_idx" ON "payout_method"("partnerId", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "withdrawal_reference_key" ON "withdrawal"("reference");

-- CreateIndex
CREATE INDEX "withdrawal_partnerId_requestedAt_idx" ON "withdrawal"("partnerId", "requestedAt" DESC);

-- CreateIndex
CREATE INDEX "withdrawal_payoutMethodId_idx" ON "withdrawal"("payoutMethodId");

-- CreateIndex
CREATE UNIQUE INDEX "withdrawal_partnerId_idempotencyKey_key" ON "withdrawal"("partnerId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "withdrawal_event_withdrawalId_at_idx" ON "withdrawal_event"("withdrawalId", "at");

-- CreateIndex
CREATE INDEX "withdrawal_event_actorUserId_idx" ON "withdrawal_event"("actorUserId");

-- CreateIndex
CREATE INDEX "lead_retentionUntil_idx" ON "lead"("retentionUntil");

-- CreateIndex
CREATE INDEX "lead_kind_createdAt_idx" ON "lead"("kind", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner" ADD CONSTRAINT "partner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student" ADD CONSTRAINT "student_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission" ADD CONSTRAINT "commission_studentId_partnerId_fkey" FOREIGN KEY ("studentId", "partnerId") REFERENCES "student"("id", "partnerId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission" ADD CONSTRAINT "commission_partnerId_currency_fkey" FOREIGN KEY ("partnerId", "currency") REFERENCES "partner"("id", "currency") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_method" ADD CONSTRAINT "payout_method_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal" ADD CONSTRAINT "withdrawal_partnerId_currency_fkey" FOREIGN KEY ("partnerId", "currency") REFERENCES "partner"("id", "currency") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal" ADD CONSTRAINT "withdrawal_payoutMethodId_fkey" FOREIGN KEY ("payoutMethodId") REFERENCES "payout_method"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_event" ADD CONSTRAINT "withdrawal_event_withdrawalId_fkey" FOREIGN KEY ("withdrawalId") REFERENCES "withdrawal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_event" ADD CONSTRAINT "withdrawal_event_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

