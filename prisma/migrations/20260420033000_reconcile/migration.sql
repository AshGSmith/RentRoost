CREATE TYPE "ReconciliationEntryType" AS ENUM ('INCOME', 'EXPENSE');
CREATE TYPE "BankTransactionStatus" AS ENUM ('REVIEW', 'RECONCILED', 'IGNORED');

ALTER TABLE "UserSettings"
  ADD COLUMN "autoReconciliationEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "autoReconciliationMinConfidence" INTEGER NOT NULL DEFAULT 85;

ALTER TABLE "IncomeEntry"
  ADD COLUMN "bankTransactionId" TEXT;

ALTER TABLE "ExpenseEntry"
  ADD COLUMN "bankTransactionId" TEXT;

CREATE TABLE "BankAccount" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "institutionName" TEXT,
  "accountMask" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'GBP',
  "provider" TEXT NOT NULL DEFAULT 'manual',
  "providerAccountId" TEXT,
  "autoReconciliationEnabled" BOOLEAN,
  "autoReconciliationMinConfidence" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BankTransaction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "bankAccountId" TEXT NOT NULL,
  "externalTransactionId" TEXT,
  "bookedAt" TIMESTAMP(3) NOT NULL,
  "valueDate" TIMESTAMP(3),
  "amount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'GBP',
  "description" TEXT NOT NULL,
  "normalizedDescription" TEXT NOT NULL,
  "counterparty" TEXT,
  "reference" TEXT,
  "confidenceScore" INTEGER,
  "status" "BankTransactionStatus" NOT NULL DEFAULT 'REVIEW',
  "reconciliationType" "ReconciliationEntryType",
  "suggestedRuleId" TEXT,
  "ignoredAt" TIMESTAMP(3),
  "reconciledAt" TIMESTAMP(3),
  "rawData" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReconciliationRule" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "bankAccountId" TEXT,
  "name" TEXT NOT NULL,
  "type" "ReconciliationEntryType" NOT NULL,
  "normalizedDescription" TEXT NOT NULL,
  "amount" DECIMAL(10,2),
  "counterparty" TEXT,
  "categoryId" TEXT NOT NULL,
  "tenancyAgreementId" TEXT,
  "organisationExpense" BOOLEAN NOT NULL DEFAULT false,
  "supplier" TEXT,
  "expenseDescription" TEXT,
  "incomeNotes" TEXT,
  "removeVat" BOOLEAN NOT NULL DEFAULT false,
  "paid" BOOLEAN NOT NULL DEFAULT true,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "autoApply" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReconciliationRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IncomeEntry_bankTransactionId_key" ON "IncomeEntry"("bankTransactionId");
CREATE UNIQUE INDEX "ExpenseEntry_bankTransactionId_key" ON "ExpenseEntry"("bankTransactionId");
CREATE INDEX "IncomeEntry_bankTransactionId_idx" ON "IncomeEntry"("bankTransactionId");
CREATE INDEX "ExpenseEntry_bankTransactionId_idx" ON "ExpenseEntry"("bankTransactionId");
CREATE INDEX "BankAccount_userId_idx" ON "BankAccount"("userId");
CREATE INDEX "BankAccount_provider_idx" ON "BankAccount"("provider");
CREATE INDEX "BankTransaction_userId_idx" ON "BankTransaction"("userId");
CREATE INDEX "BankTransaction_bankAccountId_status_idx" ON "BankTransaction"("bankAccountId", "status");
CREATE INDEX "BankTransaction_bookedAt_idx" ON "BankTransaction"("bookedAt");
CREATE INDEX "BankTransaction_normalizedDescription_idx" ON "BankTransaction"("normalizedDescription");
CREATE INDEX "BankTransaction_suggestedRuleId_idx" ON "BankTransaction"("suggestedRuleId");
CREATE INDEX "ReconciliationRule_userId_idx" ON "ReconciliationRule"("userId");
CREATE INDEX "ReconciliationRule_bankAccountId_idx" ON "ReconciliationRule"("bankAccountId");
CREATE INDEX "ReconciliationRule_categoryId_idx" ON "ReconciliationRule"("categoryId");
CREATE INDEX "ReconciliationRule_normalizedDescription_idx" ON "ReconciliationRule"("normalizedDescription");
CREATE INDEX "ReconciliationRule_enabled_autoApply_idx" ON "ReconciliationRule"("enabled", "autoApply");

ALTER TABLE "IncomeEntry"
  ADD CONSTRAINT "IncomeEntry_bankTransactionId_fkey"
  FOREIGN KEY ("bankTransactionId") REFERENCES "BankTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ExpenseEntry"
  ADD CONSTRAINT "ExpenseEntry_bankTransactionId_fkey"
  FOREIGN KEY ("bankTransactionId") REFERENCES "BankTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BankAccount"
  ADD CONSTRAINT "BankAccount_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BankTransaction"
  ADD CONSTRAINT "BankTransaction_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BankTransaction"
  ADD CONSTRAINT "BankTransaction_bankAccountId_fkey"
  FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BankTransaction"
  ADD CONSTRAINT "BankTransaction_suggestedRuleId_fkey"
  FOREIGN KEY ("suggestedRuleId") REFERENCES "ReconciliationRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReconciliationRule"
  ADD CONSTRAINT "ReconciliationRule_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReconciliationRule"
  ADD CONSTRAINT "ReconciliationRule_bankAccountId_fkey"
  FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReconciliationRule"
  ADD CONSTRAINT "ReconciliationRule_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "CashflowCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReconciliationRule"
  ADD CONSTRAINT "ReconciliationRule_tenancyAgreementId_fkey"
  FOREIGN KEY ("tenancyAgreementId") REFERENCES "TenancyAgreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
