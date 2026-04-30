CREATE TYPE "ReminderFrequency" AS ENUM ('WEEKLY', 'MONTHLY', 'ANNUAL');
CREATE TYPE "ReminderKind" AS ENUM ('GENERAL', 'RENT_REVIEW');

CREATE TABLE "Reminder" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "propertyId" TEXT,
  "tenancyAgreementId" TEXT,
  "description" TEXT NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "reminderAt" TIMESTAMP(3) NOT NULL,
  "critical" BOOLEAN NOT NULL DEFAULT false,
  "recurring" BOOLEAN NOT NULL DEFAULT false,
  "recurringFrequency" "ReminderFrequency",
  "kind" "ReminderKind" NOT NULL DEFAULT 'GENERAL',
  "systemGroupKey" TEXT,
  "isComplete" BOOLEAN NOT NULL DEFAULT false,
  "completedAt" TIMESTAMP(3),
  "lastNotificationAttemptAt" TIMESTAMP(3),
  "lastNotifiedAt" TIMESTAMP(3),
  "notificationFailureAt" TIMESTAMP(3),
  "notificationFailureMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Reminder_userId_idx" ON "Reminder"("userId");
CREATE INDEX "Reminder_propertyId_idx" ON "Reminder"("propertyId");
CREATE INDEX "Reminder_tenancyAgreementId_idx" ON "Reminder"("tenancyAgreementId");
CREATE INDEX "Reminder_isComplete_dueDate_idx" ON "Reminder"("isComplete", "dueDate");
CREATE INDEX "Reminder_critical_dueDate_idx" ON "Reminder"("critical", "dueDate");
CREATE INDEX "Reminder_reminderAt_idx" ON "Reminder"("reminderAt");
CREATE INDEX "Reminder_systemGroupKey_idx" ON "Reminder"("systemGroupKey");

ALTER TABLE "Reminder"
  ADD CONSTRAINT "Reminder_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Reminder"
  ADD CONSTRAINT "Reminder_propertyId_fkey"
  FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Reminder"
  ADD CONSTRAINT "Reminder_tenancyAgreementId_fkey"
  FOREIGN KEY ("tenancyAgreementId") REFERENCES "TenancyAgreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
