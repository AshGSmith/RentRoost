-- CreateEnum
CREATE TYPE "TemplateKind" AS ENUM ('CUSTOM', 'NEW_TENANT_WELCOME', 'RENT_INCREASE');

-- AlterEnum
ALTER TYPE "DocumentCategory" ADD VALUE 'GENERATED_TEMPLATE';

-- AlterTable
ALTER TABLE "DocumentRecord"
ADD COLUMN "templateId" TEXT,
ADD COLUMN "name" TEXT NOT NULL DEFAULT 'Untitled document',
ADD COLUMN "organisationDocument" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "metadata" JSONB;

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "defaultKey" TEXT,
    "name" TEXT NOT NULL,
    "kind" "TemplateKind" NOT NULL DEFAULT 'CUSTOM',
    "content" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentTemplate_userId_defaultKey_key" ON "DocumentTemplate"("userId", "defaultKey");

-- CreateIndex
CREATE INDEX "DocumentTemplate_userId_idx" ON "DocumentTemplate"("userId");

-- CreateIndex
CREATE INDEX "DocumentRecord_templateId_idx" ON "DocumentRecord"("templateId");

-- AddForeignKey
ALTER TABLE "DocumentRecord" ADD CONSTRAINT "DocumentRecord_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
