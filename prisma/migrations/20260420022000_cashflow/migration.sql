CREATE TYPE "CashflowCategoryType" AS ENUM ('INCOME', 'EXPENSE');

CREATE TABLE "CashflowCategory" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "CashflowCategoryType" NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CashflowCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IncomeEntry" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "tenancyAgreementId" TEXT,
  "amount" DECIMAL(10,2) NOT NULL,
  "paymentDate" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IncomeEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExpenseEntry" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "tenancyAgreementId" TEXT,
  "grossAmount" DECIMAL(10,2) NOT NULL,
  "netAmount" DECIMAL(10,2) NOT NULL,
  "vatAmount" DECIMAL(10,2) NOT NULL,
  "removeVat" BOOLEAN NOT NULL DEFAULT false,
  "description" TEXT NOT NULL,
  "invoiceNumber" TEXT,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "supplier" TEXT NOT NULL,
  "paid" BOOLEAN NOT NULL DEFAULT false,
  "organisationExpense" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExpenseEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CashflowCategory_userId_type_name_key" ON "CashflowCategory"("userId", "type", "name");
CREATE INDEX "CashflowCategory_userId_type_idx" ON "CashflowCategory"("userId", "type");
CREATE INDEX "IncomeEntry_userId_idx" ON "IncomeEntry"("userId");
CREATE INDEX "IncomeEntry_categoryId_idx" ON "IncomeEntry"("categoryId");
CREATE INDEX "IncomeEntry_tenancyAgreementId_idx" ON "IncomeEntry"("tenancyAgreementId");
CREATE INDEX "IncomeEntry_paymentDate_idx" ON "IncomeEntry"("paymentDate");
CREATE INDEX "ExpenseEntry_userId_idx" ON "ExpenseEntry"("userId");
CREATE INDEX "ExpenseEntry_categoryId_idx" ON "ExpenseEntry"("categoryId");
CREATE INDEX "ExpenseEntry_tenancyAgreementId_idx" ON "ExpenseEntry"("tenancyAgreementId");
CREATE INDEX "ExpenseEntry_dueDate_idx" ON "ExpenseEntry"("dueDate");
CREATE INDEX "ExpenseEntry_paid_idx" ON "ExpenseEntry"("paid");

ALTER TABLE "CashflowCategory"
  ADD CONSTRAINT "CashflowCategory_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IncomeEntry"
  ADD CONSTRAINT "IncomeEntry_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IncomeEntry"
  ADD CONSTRAINT "IncomeEntry_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "CashflowCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "IncomeEntry"
  ADD CONSTRAINT "IncomeEntry_tenancyAgreementId_fkey"
  FOREIGN KEY ("tenancyAgreementId") REFERENCES "TenancyAgreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ExpenseEntry"
  ADD CONSTRAINT "ExpenseEntry_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExpenseEntry"
  ADD CONSTRAINT "ExpenseEntry_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "CashflowCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ExpenseEntry"
  ADD CONSTRAINT "ExpenseEntry_tenancyAgreementId_fkey"
  FOREIGN KEY ("tenancyAgreementId") REFERENCES "TenancyAgreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
