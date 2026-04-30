CREATE TYPE "DocumentCategory" AS ENUM ('TENANCY_AGREEMENT', 'GENERAL');

CREATE TABLE "Landlord" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phoneNumber" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Landlord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Property" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "landlordId" TEXT,
  "name" TEXT NOT NULL,
  "addressLine1" TEXT NOT NULL,
  "addressLine2" TEXT,
  "city" TEXT NOT NULL,
  "postcode" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Tenant" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "surname" TEXT NOT NULL,
  "phoneNumber" TEXT NOT NULL,
  "email" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TenancyAgreement" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "landlordId" TEXT,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3),
  "paymentDay" INTEGER NOT NULL,
  "depositAmount" DECIMAL(10,2) NOT NULL,
  "rentReviewDate" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TenancyAgreement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TenancyParticipant" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tenancyAgreementId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TenancyParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RentChange" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tenancyAgreementId" TEXT NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "effectiveDate" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RentChange_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentRecord" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "propertyId" TEXT,
  "tenancyAgreementId" TEXT,
  "category" "DocumentCategory" NOT NULL DEFAULT 'GENERAL',
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "fileData" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DocumentRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Landlord_userId_idx" ON "Landlord"("userId");
CREATE INDEX "Property_userId_idx" ON "Property"("userId");
CREATE INDEX "Property_landlordId_idx" ON "Property"("landlordId");
CREATE INDEX "Tenant_userId_idx" ON "Tenant"("userId");
CREATE INDEX "TenancyAgreement_userId_idx" ON "TenancyAgreement"("userId");
CREATE INDEX "TenancyAgreement_propertyId_idx" ON "TenancyAgreement"("propertyId");
CREATE INDEX "TenancyAgreement_landlordId_idx" ON "TenancyAgreement"("landlordId");
CREATE INDEX "TenancyParticipant_userId_idx" ON "TenancyParticipant"("userId");
CREATE INDEX "TenancyParticipant_tenantId_idx" ON "TenancyParticipant"("tenantId");
CREATE INDEX "TenancyParticipant_tenancyAgreementId_idx" ON "TenancyParticipant"("tenancyAgreementId");
CREATE UNIQUE INDEX "TenancyParticipant_tenancyAgreementId_tenantId_key" ON "TenancyParticipant"("tenancyAgreementId", "tenantId");
CREATE INDEX "RentChange_userId_idx" ON "RentChange"("userId");
CREATE INDEX "RentChange_tenancyAgreementId_idx" ON "RentChange"("tenancyAgreementId");
CREATE INDEX "RentChange_effectiveDate_idx" ON "RentChange"("effectiveDate");
CREATE INDEX "DocumentRecord_userId_idx" ON "DocumentRecord"("userId");
CREATE INDEX "DocumentRecord_propertyId_idx" ON "DocumentRecord"("propertyId");
CREATE INDEX "DocumentRecord_tenancyAgreementId_idx" ON "DocumentRecord"("tenancyAgreementId");
CREATE INDEX "DocumentRecord_category_idx" ON "DocumentRecord"("category");

ALTER TABLE "Landlord"
  ADD CONSTRAINT "Landlord_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Property"
  ADD CONSTRAINT "Property_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Property"
  ADD CONSTRAINT "Property_landlordId_fkey"
  FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Tenant"
  ADD CONSTRAINT "Tenant_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TenancyAgreement"
  ADD CONSTRAINT "TenancyAgreement_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TenancyAgreement"
  ADD CONSTRAINT "TenancyAgreement_propertyId_fkey"
  FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TenancyAgreement"
  ADD CONSTRAINT "TenancyAgreement_landlordId_fkey"
  FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TenancyParticipant"
  ADD CONSTRAINT "TenancyParticipant_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TenancyParticipant"
  ADD CONSTRAINT "TenancyParticipant_tenancyAgreementId_fkey"
  FOREIGN KEY ("tenancyAgreementId") REFERENCES "TenancyAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TenancyParticipant"
  ADD CONSTRAINT "TenancyParticipant_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RentChange"
  ADD CONSTRAINT "RentChange_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RentChange"
  ADD CONSTRAINT "RentChange_tenancyAgreementId_fkey"
  FOREIGN KEY ("tenancyAgreementId") REFERENCES "TenancyAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentRecord"
  ADD CONSTRAINT "DocumentRecord_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentRecord"
  ADD CONSTRAINT "DocumentRecord_propertyId_fkey"
  FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentRecord"
  ADD CONSTRAINT "DocumentRecord_tenancyAgreementId_fkey"
  FOREIGN KEY ("tenancyAgreementId") REFERENCES "TenancyAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
