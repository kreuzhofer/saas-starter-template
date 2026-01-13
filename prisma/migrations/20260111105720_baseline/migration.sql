-- CreateEnum
CREATE TYPE "AccountTier" AS ENUM ('starter', 'pro', 'business', 'enterprise');

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "username" VARCHAR(255) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "role" VARCHAR(50) NOT NULL DEFAULT 'account_owner',
    "language" VARCHAR(10) NOT NULL DEFAULT 'en',
    "firstName" VARCHAR(50),
    "lastName" VARCHAR(50),
    "tier" "AccountTier" NOT NULL DEFAULT 'starter',

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_confirmation_tokens" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_confirmation_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_change_tokens" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "newEmail" VARCHAR(255) NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_change_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_task_status" (
    "id" UUID NOT NULL,
    "taskName" VARCHAR(100) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRun" TIMESTAMP(3),
    "nextRun" TIMESTAMP(3),
    "lastResult" VARCHAR(20),
    "lastError" TEXT,
    "lastDuration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_task_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_records" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "limitName" VARCHAR(100) NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "limit_overrides" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "limitName" VARCHAR(100) NOT NULL,
    "overrideValue" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "limit_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banners" (
    "id" UUID NOT NULL,
    "key" VARCHAR(255),
    "accountId" UUID,
    "type" VARCHAR(20) NOT NULL,
    "message" TEXT NOT NULL,
    "dismissable" BOOLEAN NOT NULL DEFAULT true,
    "audience" VARCHAR(20) NOT NULL DEFAULT 'authenticated',
    "linkText" VARCHAR(255),
    "linkUrl" TEXT,
    "linkExternal" BOOLEAN NOT NULL DEFAULT false,
    "linkStyle" VARCHAR(20),
    "backgroundColor" VARCHAR(50),
    "textColor" VARCHAR(50),
    "scheduledStart" TIMESTAMP(3),
    "scheduledEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banner_dismissals" (
    "id" UUID NOT NULL,
    "bannerId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "banner_dismissals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_username_key" ON "accounts"("username");

-- CreateIndex
CREATE INDEX "accounts_username_idx" ON "accounts"("username");

-- CreateIndex
CREATE INDEX "accounts_role_idx" ON "accounts"("role");

-- CreateIndex
CREATE INDEX "accounts_tier_idx" ON "accounts"("tier");

-- CreateIndex
CREATE UNIQUE INDEX "email_confirmation_tokens_token_key" ON "email_confirmation_tokens"("token");

-- CreateIndex
CREATE INDEX "email_confirmation_tokens_token_idx" ON "email_confirmation_tokens"("token");

-- CreateIndex
CREATE INDEX "email_confirmation_tokens_accountId_idx" ON "email_confirmation_tokens"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_token_idx" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_accountId_idx" ON "password_reset_tokens"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "email_change_tokens_token_key" ON "email_change_tokens"("token");

-- CreateIndex
CREATE INDEX "email_change_tokens_token_idx" ON "email_change_tokens"("token");

-- CreateIndex
CREATE INDEX "email_change_tokens_accountId_idx" ON "email_change_tokens"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "scheduled_task_status_taskName_key" ON "scheduled_task_status"("taskName");

-- CreateIndex
CREATE INDEX "scheduled_task_status_taskName_idx" ON "scheduled_task_status"("taskName");

-- CreateIndex
CREATE INDEX "scheduled_task_status_enabled_idx" ON "scheduled_task_status"("enabled");

-- CreateIndex
CREATE INDEX "scheduled_task_status_lastRun_idx" ON "scheduled_task_status"("lastRun");

-- CreateIndex
CREATE INDEX "usage_records_accountId_idx" ON "usage_records"("accountId");

-- CreateIndex
CREATE INDEX "usage_records_periodStart_idx" ON "usage_records"("periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "usage_records_accountId_limitName_periodStart_key" ON "usage_records"("accountId", "limitName", "periodStart");

-- CreateIndex
CREATE INDEX "limit_overrides_accountId_idx" ON "limit_overrides"("accountId");

-- CreateIndex
CREATE INDEX "limit_overrides_expiresAt_idx" ON "limit_overrides"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "limit_overrides_accountId_limitName_key" ON "limit_overrides"("accountId", "limitName");

-- CreateIndex
CREATE INDEX "banners_key_idx" ON "banners"("key");

-- CreateIndex
CREATE INDEX "banners_accountId_idx" ON "banners"("accountId");

-- CreateIndex
CREATE INDEX "banners_type_idx" ON "banners"("type");

-- CreateIndex
CREATE INDEX "banners_scheduledStart_idx" ON "banners"("scheduledStart");

-- CreateIndex
CREATE INDEX "banners_scheduledEnd_idx" ON "banners"("scheduledEnd");

-- CreateIndex
CREATE INDEX "banners_audience_idx" ON "banners"("audience");

-- CreateIndex
CREATE INDEX "banner_dismissals_bannerId_idx" ON "banner_dismissals"("bannerId");

-- CreateIndex
CREATE INDEX "banner_dismissals_accountId_idx" ON "banner_dismissals"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "banner_dismissals_bannerId_accountId_key" ON "banner_dismissals"("bannerId", "accountId");

-- AddForeignKey
ALTER TABLE "email_confirmation_tokens" ADD CONSTRAINT "email_confirmation_tokens_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_change_tokens" ADD CONSTRAINT "email_change_tokens_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "limit_overrides" ADD CONSTRAINT "limit_overrides_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banners" ADD CONSTRAINT "banners_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banner_dismissals" ADD CONSTRAINT "banner_dismissals_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "banners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banner_dismissals" ADD CONSTRAINT "banner_dismissals_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
