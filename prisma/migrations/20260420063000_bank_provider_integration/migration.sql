-- CreateEnum
CREATE TYPE "BankConnectionStatus" AS ENUM ('DISCONNECTED', 'PENDING', 'CONNECTED', 'ERROR', 'REVOKED');

-- AlterTable
ALTER TABLE "BankAccount"
ADD COLUMN "providerAccessTokenEnc" TEXT,
ADD COLUMN "providerRefreshTokenEnc" TEXT,
ADD COLUMN "providerTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN "providerConsentExpiresAt" TIMESTAMP(3),
ADD COLUMN "connectionStatus" "BankConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
ADD COLUMN "providerLastSyncCursor" TIMESTAMP(3),
ADD COLUMN "lastSyncAttemptAt" TIMESTAMP(3),
ADD COLUMN "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN "lastSyncError" TEXT,
ADD COLUMN "lastWebhookAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "BankAccount_providerAccountId_idx" ON "BankAccount"("providerAccountId");

-- CreateIndex
CREATE INDEX "BankAccount_connectionStatus_idx" ON "BankAccount"("connectionStatus");

-- Preserve current manual accounts as usable after rollout
UPDATE "BankAccount"
SET "connectionStatus" = 'CONNECTED'
WHERE "provider" = 'manual';
