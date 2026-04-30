import { Role, type Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export class BackupError extends Error {
  fieldErrors?: Record<string, string[]>;

  constructor(message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "BackupError";
    this.fieldErrors = fieldErrors;
  }
}

const backupSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  user: z.object({
    email: z.string(),
    firstName: z.string(),
    lastName: z.string()
  }),
  settings: z.record(z.any()).nullable(),
  organisation: z.record(z.any()).nullable(),
  cashflowCategories: z.array(z.record(z.any())),
  landlords: z.array(z.record(z.any())),
  properties: z.array(z.record(z.any())),
  tenants: z.array(z.record(z.any())),
  tenancyAgreements: z.array(z.record(z.any())),
  tenancyParticipants: z.array(z.record(z.any())),
  rentChanges: z.array(z.record(z.any())),
  reminders: z.array(z.record(z.any())),
  incomes: z.array(z.record(z.any())),
  expenses: z.array(z.record(z.any())),
  bankAccounts: z.array(z.record(z.any())),
  reconciliationRules: z.array(z.record(z.any())),
  documents: z.array(z.record(z.any())),
  templates: z.array(z.record(z.any()))
});

export function resolveBackupTargetUserId(input: {
  actorRole: Role;
  actorTenantUserId: string;
  managedUserId?: string | null;
}) {
  const managedUserId = input.managedUserId?.trim();

  if (!managedUserId) {
    return input.actorTenantUserId;
  }

  if (input.actorRole !== "ADMIN") {
    throw new BackupError("Only admins can run managed backup actions.");
  }

  return managedUserId;
}

async function ensureTargetUserExists(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new BackupError("Target user not found.");
  }

  return user;
}

function serializeDate(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function serializeDecimal(value: Prisma.Decimal | null | undefined) {
  return value ? value.toString() : null;
}

function serializeBytes(value: Uint8Array | null | undefined) {
  return value ? Buffer.from(value).toString("base64") : null;
}

function parseDate(value: unknown) {
  return value ? new Date(String(value)) : null;
}

function parseDecimal(value: unknown) {
  return value != null ? value : null;
}

function parseBytes(value: unknown) {
  return value ? Buffer.from(String(value), "base64") : null;
}

async function reserveId<T extends { id: string; userId: string }>(
  model: {
    findUnique(args: { where: { id: string } }): Promise<T | null>;
  },
  sourceId: string,
  targetUserId: string,
  idMap: Map<string, string>,
  existingIdMap?: Map<string, string>
) {
  if (idMap.has(sourceId)) {
    return idMap.get(sourceId)!;
  }

  const existing = await model.findUnique({ where: { id: sourceId } });
  if (!existing) {
    idMap.set(sourceId, sourceId);
    return sourceId;
  }

  if (existing.userId === targetUserId) {
    idMap.set(sourceId, sourceId);
    return sourceId;
  }

  const generated = existingIdMap?.get(sourceId) ?? crypto.randomUUID();
  idMap.set(sourceId, generated);
  existingIdMap?.set(sourceId, generated);
  return generated;
}

export async function listManagedBackupUsers() {
  return prisma.user.findMany({
    orderBy: [{ email: "asc" }],
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true
    }
  });
}

export async function exportUserBackup(targetUserId: string) {
  const user = await ensureTargetUserExists(targetUserId);
  const [
    settings,
    organisation,
    cashflowCategories,
    landlords,
    properties,
    tenants,
    tenancyAgreements,
    tenancyParticipants,
    rentChanges,
    reminders,
    incomes,
    expenses,
    bankAccounts,
    reconciliationRules,
    documents,
    templates
  ] = await Promise.all([
    prisma.userSettings.findUnique({ where: { userId: targetUserId } }),
    prisma.organisationSettings.findUnique({ where: { userId: targetUserId } }),
    prisma.cashflowCategory.findMany({ where: { userId: targetUserId } }),
    prisma.landlord.findMany({ where: { userId: targetUserId } }),
    prisma.property.findMany({ where: { userId: targetUserId } }),
    prisma.tenant.findMany({ where: { userId: targetUserId } }),
    prisma.tenancyAgreement.findMany({ where: { userId: targetUserId } }),
    prisma.tenancyParticipant.findMany({ where: { userId: targetUserId } }),
    prisma.rentChange.findMany({ where: { userId: targetUserId } }),
    prisma.reminder.findMany({ where: { userId: targetUserId } }),
    prisma.incomeEntry.findMany({ where: { userId: targetUserId } }),
    prisma.expenseEntry.findMany({ where: { userId: targetUserId } }),
    prisma.bankAccount.findMany({ where: { userId: targetUserId } }),
    prisma.reconciliationRule.findMany({ where: { userId: targetUserId } }),
    prisma.documentRecord.findMany({ where: { userId: targetUserId } }),
    prisma.documentTemplate.findMany({ where: { userId: targetUserId } })
  ]);

  return {
    version: 1 as const,
    exportedAt: new Date().toISOString(),
    user: {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    },
    settings,
    organisation: organisation
      ? {
          ...organisation,
          logoData: serializeBytes(organisation.logoData)
        }
      : null,
    cashflowCategories,
    landlords,
    properties,
    tenants,
    tenancyAgreements: tenancyAgreements.map((record) => ({
      ...record,
      startDate: serializeDate(record.startDate),
      endDate: serializeDate(record.endDate),
      rentReviewDate: serializeDate(record.rentReviewDate),
      depositAmount: serializeDecimal(record.depositAmount)
    })),
    tenancyParticipants,
    rentChanges: rentChanges.map((record) => ({
      ...record,
      amount: serializeDecimal(record.amount),
      effectiveDate: serializeDate(record.effectiveDate)
    })),
    reminders: reminders.map((record) => ({
      ...record,
      dueDate: serializeDate(record.dueDate),
      reminderAt: serializeDate(record.reminderAt),
      completedAt: serializeDate(record.completedAt),
      lastNotificationAttemptAt: serializeDate(record.lastNotificationAttemptAt),
      lastNotifiedAt: serializeDate(record.lastNotifiedAt),
      notificationFailureAt: serializeDate(record.notificationFailureAt),
      createdAt: serializeDate(record.createdAt),
      updatedAt: serializeDate(record.updatedAt)
    })),
    incomes: incomes.map((record) => ({
      ...record,
      amount: serializeDecimal(record.amount),
      paymentDate: serializeDate(record.paymentDate)
    })),
    expenses: expenses.map((record) => ({
      ...record,
      grossAmount: serializeDecimal(record.grossAmount),
      netAmount: serializeDecimal(record.netAmount),
      vatAmount: serializeDecimal(record.vatAmount),
      dueDate: serializeDate(record.dueDate)
    })),
    bankAccounts,
    reconciliationRules: reconciliationRules.map((record) => ({
      ...record,
      amount: serializeDecimal(record.amount)
    })),
    documents: documents.map((record) => ({
      ...record,
      fileData: serializeBytes(record.fileData)
    })),
    templates,
    meta: {
      includesBinaryDocuments: true
    }
  };
}

export async function importUserBackup(targetUserId: string, payload: unknown) {
  const parsed = backupSchema.safeParse(payload);
  if (!parsed.success) {
    throw new BackupError("Backup file is invalid.");
  }

  await ensureTargetUserExists(targetUserId);

  const categoryIdMap = new Map<string, string>();
  const landlordIdMap = new Map<string, string>();
  const propertyIdMap = new Map<string, string>();
  const tenantIdMap = new Map<string, string>();
  const tenancyIdMap = new Map<string, string>();
  const bankAccountIdMap = new Map<string, string>();
  const templateIdMap = new Map<string, string>();

  const report = {
    targetUserId,
    imported: [] as string[],
    updated: [] as string[],
    warnings: [] as string[]
  };

  await prisma.$transaction(async (tx) => {
    if (parsed.data.settings) {
      await tx.userSettings.upsert({
        where: { userId: targetUserId },
        update: {
          theme: parsed.data.settings.theme,
          currencyDesignator: parsed.data.settings.currencyDesignator,
          autoReconciliationEnabled: parsed.data.settings.autoReconciliationEnabled,
          autoReconciliationMinConfidence: parsed.data.settings.autoReconciliationMinConfidence
        },
        create: {
          userId: targetUserId,
          theme: parsed.data.settings.theme,
          currencyDesignator: parsed.data.settings.currencyDesignator,
          autoReconciliationEnabled: parsed.data.settings.autoReconciliationEnabled,
          autoReconciliationMinConfidence: parsed.data.settings.autoReconciliationMinConfidence
        }
      });
      report.updated.push("user settings");
    }

    if (parsed.data.organisation) {
      await tx.organisationSettings.upsert({
        where: { userId: targetUserId },
        update: {
          organisationName: parsed.data.organisation.organisationName,
          logoData: parseBytes(parsed.data.organisation.logoData),
          logoMimeType: parsed.data.organisation.logoMimeType,
          logoFileName: parsed.data.organisation.logoFileName,
          contactName: parsed.data.organisation.contactName,
          contactNumber: parsed.data.organisation.contactNumber,
          contactEmail: parsed.data.organisation.contactEmail,
          bankName: parsed.data.organisation.bankName,
          bankSortCode: parsed.data.organisation.bankSortCode,
          bankAccountNumber: parsed.data.organisation.bankAccountNumber,
          bankAccountName: parsed.data.organisation.bankAccountName
        },
        create: {
          userId: targetUserId,
          organisationName: parsed.data.organisation.organisationName,
          logoData: parseBytes(parsed.data.organisation.logoData),
          logoMimeType: parsed.data.organisation.logoMimeType,
          logoFileName: parsed.data.organisation.logoFileName,
          contactName: parsed.data.organisation.contactName,
          contactNumber: parsed.data.organisation.contactNumber,
          contactEmail: parsed.data.organisation.contactEmail,
          bankName: parsed.data.organisation.bankName,
          bankSortCode: parsed.data.organisation.bankSortCode,
          bankAccountNumber: parsed.data.organisation.bankAccountNumber,
          bankAccountName: parsed.data.organisation.bankAccountName
        }
      });
      report.updated.push("organisation settings");
    }

    for (const record of parsed.data.cashflowCategories) {
      const id = await reserveId(tx.cashflowCategory, String(record.id), targetUserId, categoryIdMap);
      await tx.cashflowCategory.upsert({
        where: { id },
        update: {
          name: String(record.name),
          type: record.type,
          isDefault: Boolean(record.isDefault)
        },
        create: {
          id,
          userId: targetUserId,
          name: String(record.name),
          type: record.type,
          isDefault: Boolean(record.isDefault)
        }
      });
    }
    report.imported.push(`${parsed.data.cashflowCategories.length} categories`);

    for (const record of parsed.data.landlords) {
      const id = await reserveId(tx.landlord, String(record.id), targetUserId, landlordIdMap);
      await tx.landlord.upsert({
        where: { id },
        update: {
          name: String(record.name),
          email: record.email ? String(record.email) : null,
          phoneNumber: record.phoneNumber ? String(record.phoneNumber) : null,
          notes: record.notes ? String(record.notes) : null
        },
        create: {
          id,
          userId: targetUserId,
          name: String(record.name),
          email: record.email ? String(record.email) : null,
          phoneNumber: record.phoneNumber ? String(record.phoneNumber) : null,
          notes: record.notes ? String(record.notes) : null
        }
      });
    }
    report.imported.push(`${parsed.data.landlords.length} landlords`);

    for (const record of parsed.data.properties) {
      const id = await reserveId(tx.property, String(record.id), targetUserId, propertyIdMap);
      await tx.property.upsert({
        where: { id },
        update: {
          landlordId: record.landlordId ? landlordIdMap.get(String(record.landlordId)) ?? null : null,
          name: String(record.name),
          addressLine1: String(record.addressLine1),
          addressLine2: record.addressLine2 ? String(record.addressLine2) : null,
          city: String(record.city),
          postcode: String(record.postcode),
          notes: record.notes ? String(record.notes) : null
        },
        create: {
          id,
          userId: targetUserId,
          landlordId: record.landlordId ? landlordIdMap.get(String(record.landlordId)) ?? null : null,
          name: String(record.name),
          addressLine1: String(record.addressLine1),
          addressLine2: record.addressLine2 ? String(record.addressLine2) : null,
          city: String(record.city),
          postcode: String(record.postcode),
          notes: record.notes ? String(record.notes) : null
        }
      });
    }
    report.imported.push(`${parsed.data.properties.length} properties`);

    for (const record of parsed.data.tenants) {
      const id = await reserveId(tx.tenant, String(record.id), targetUserId, tenantIdMap);
      await tx.tenant.upsert({
        where: { id },
        update: {
          firstName: String(record.firstName),
          surname: String(record.surname),
          phoneNumber: String(record.phoneNumber),
          email: record.email ? String(record.email) : null
        },
        create: {
          id,
          userId: targetUserId,
          firstName: String(record.firstName),
          surname: String(record.surname),
          phoneNumber: String(record.phoneNumber),
          email: record.email ? String(record.email) : null
        }
      });
    }
    report.imported.push(`${parsed.data.tenants.length} tenants`);

    for (const record of parsed.data.tenancyAgreements) {
      const id = await reserveId(tx.tenancyAgreement, String(record.id), targetUserId, tenancyIdMap);
      await tx.tenancyAgreement.upsert({
        where: { id },
        update: {
          propertyId: propertyIdMap.get(String(record.propertyId))!,
          landlordId: record.landlordId ? landlordIdMap.get(String(record.landlordId)) ?? null : null,
          startDate: parseDate(record.startDate)!,
          endDate: parseDate(record.endDate),
          paymentDay: Number(record.paymentDay),
          depositAmount: parseDecimal(record.depositAmount)!,
          rentReviewDate: parseDate(record.rentReviewDate)!
        },
        create: {
          id,
          userId: targetUserId,
          propertyId: propertyIdMap.get(String(record.propertyId))!,
          landlordId: record.landlordId ? landlordIdMap.get(String(record.landlordId)) ?? null : null,
          startDate: parseDate(record.startDate)!,
          endDate: parseDate(record.endDate),
          paymentDay: Number(record.paymentDay),
          depositAmount: parseDecimal(record.depositAmount)!,
          rentReviewDate: parseDate(record.rentReviewDate)!
        }
      });
    }
    report.imported.push(`${parsed.data.tenancyAgreements.length} tenancy agreements`);

    for (const record of parsed.data.tenancyParticipants) {
      await tx.tenancyParticipant.upsert({
        where: {
          tenancyAgreementId_tenantId: {
            tenancyAgreementId: tenancyIdMap.get(String(record.tenancyAgreementId))!,
            tenantId: tenantIdMap.get(String(record.tenantId))!
          }
        },
        update: {},
        create: {
          id: crypto.randomUUID(),
          userId: targetUserId,
          tenancyAgreementId: tenancyIdMap.get(String(record.tenancyAgreementId))!,
          tenantId: tenantIdMap.get(String(record.tenantId))!
        }
      });
    }
    report.imported.push(`${parsed.data.tenancyParticipants.length} tenancy participants`);

    for (const record of parsed.data.rentChanges) {
      await tx.rentChange.upsert({
        where: { id: String(record.id) },
        update: {
          tenancyAgreementId: tenancyIdMap.get(String(record.tenancyAgreementId))!,
          amount: parseDecimal(record.amount)!,
          effectiveDate: parseDate(record.effectiveDate)!
        },
        create: {
          id: String(record.id),
          userId: targetUserId,
          tenancyAgreementId: tenancyIdMap.get(String(record.tenancyAgreementId))!,
          amount: parseDecimal(record.amount)!,
          effectiveDate: parseDate(record.effectiveDate)!
        }
      });
    }
    report.imported.push(`${parsed.data.rentChanges.length} rent changes`);

    for (const record of parsed.data.reminders) {
      await tx.reminder.upsert({
        where: { id: String(record.id) },
        update: {
          propertyId: record.propertyId ? propertyIdMap.get(String(record.propertyId)) ?? null : null,
          tenancyAgreementId: record.tenancyAgreementId ? tenancyIdMap.get(String(record.tenancyAgreementId)) ?? null : null,
          description: String(record.description),
          dueDate: parseDate(record.dueDate)!,
          reminderAt: parseDate(record.reminderAt)!,
          critical: Boolean(record.critical),
          recurring: Boolean(record.recurring),
          recurringFrequency: record.recurringFrequency ?? null,
          kind: record.kind,
          systemGroupKey: record.systemGroupKey ? String(record.systemGroupKey) : null,
          isComplete: Boolean(record.isComplete),
          completedAt: parseDate(record.completedAt)
        },
        create: {
          id: String(record.id),
          userId: targetUserId,
          propertyId: record.propertyId ? propertyIdMap.get(String(record.propertyId)) ?? null : null,
          tenancyAgreementId: record.tenancyAgreementId ? tenancyIdMap.get(String(record.tenancyAgreementId)) ?? null : null,
          description: String(record.description),
          dueDate: parseDate(record.dueDate)!,
          reminderAt: parseDate(record.reminderAt)!,
          critical: Boolean(record.critical),
          recurring: Boolean(record.recurring),
          recurringFrequency: record.recurringFrequency ?? null,
          kind: record.kind,
          systemGroupKey: record.systemGroupKey ? String(record.systemGroupKey) : null,
          isComplete: Boolean(record.isComplete),
          completedAt: parseDate(record.completedAt)
        }
      });
    }
    report.imported.push(`${parsed.data.reminders.length} reminders`);

    for (const record of parsed.data.bankAccounts) {
      const id = await reserveId(tx.bankAccount, String(record.id), targetUserId, bankAccountIdMap);
      await tx.bankAccount.upsert({
        where: { id },
        update: {
          name: String(record.name),
          institutionName: record.institutionName ? String(record.institutionName) : null,
          accountMask: record.accountMask ? String(record.accountMask) : null,
          currency: String(record.currency),
          provider: String(record.provider),
          providerAccountId: record.providerAccountId ? String(record.providerAccountId) : null,
          autoReconciliationEnabled:
            typeof record.autoReconciliationEnabled === "boolean" ? Boolean(record.autoReconciliationEnabled) : null,
          autoReconciliationMinConfidence:
            typeof record.autoReconciliationMinConfidence === "number"
              ? Number(record.autoReconciliationMinConfidence)
              : null
        },
        create: {
          id,
          userId: targetUserId,
          name: String(record.name),
          institutionName: record.institutionName ? String(record.institutionName) : null,
          accountMask: record.accountMask ? String(record.accountMask) : null,
          currency: String(record.currency),
          provider: String(record.provider),
          providerAccountId: record.providerAccountId ? String(record.providerAccountId) : null,
          autoReconciliationEnabled:
            typeof record.autoReconciliationEnabled === "boolean" ? Boolean(record.autoReconciliationEnabled) : null,
          autoReconciliationMinConfidence:
            typeof record.autoReconciliationMinConfidence === "number"
              ? Number(record.autoReconciliationMinConfidence)
              : null
        }
      });
    }
    report.imported.push(`${parsed.data.bankAccounts.length} bank accounts`);

    for (const record of parsed.data.reconciliationRules) {
      await tx.reconciliationRule.upsert({
        where: { id: String(record.id) },
        update: {
          bankAccountId: record.bankAccountId ? bankAccountIdMap.get(String(record.bankAccountId)) ?? null : null,
          name: String(record.name),
          type: record.type,
          normalizedDescription: String(record.normalizedDescription),
          amount: parseDecimal(record.amount),
          counterparty: record.counterparty ? String(record.counterparty) : null,
          categoryId: categoryIdMap.get(String(record.categoryId))!,
          tenancyAgreementId: record.tenancyAgreementId ? tenancyIdMap.get(String(record.tenancyAgreementId)) ?? null : null,
          organisationExpense: Boolean(record.organisationExpense),
          supplier: record.supplier ? String(record.supplier) : null,
          expenseDescription: record.expenseDescription ? String(record.expenseDescription) : null,
          incomeNotes: record.incomeNotes ? String(record.incomeNotes) : null,
          removeVat: Boolean(record.removeVat),
          paid: Boolean(record.paid),
          enabled: Boolean(record.enabled),
          autoApply: Boolean(record.autoApply)
        },
        create: {
          id: String(record.id),
          userId: targetUserId,
          bankAccountId: record.bankAccountId ? bankAccountIdMap.get(String(record.bankAccountId)) ?? null : null,
          name: String(record.name),
          type: record.type,
          normalizedDescription: String(record.normalizedDescription),
          amount: parseDecimal(record.amount),
          counterparty: record.counterparty ? String(record.counterparty) : null,
          categoryId: categoryIdMap.get(String(record.categoryId))!,
          tenancyAgreementId: record.tenancyAgreementId ? tenancyIdMap.get(String(record.tenancyAgreementId)) ?? null : null,
          organisationExpense: Boolean(record.organisationExpense),
          supplier: record.supplier ? String(record.supplier) : null,
          expenseDescription: record.expenseDescription ? String(record.expenseDescription) : null,
          incomeNotes: record.incomeNotes ? String(record.incomeNotes) : null,
          removeVat: Boolean(record.removeVat),
          paid: Boolean(record.paid),
          enabled: Boolean(record.enabled),
          autoApply: Boolean(record.autoApply)
        }
      });
    }
    report.imported.push(`${parsed.data.reconciliationRules.length} reconciliation rules`);

    for (const record of parsed.data.templates) {
      const id = await reserveId(tx.documentTemplate, String(record.id), targetUserId, templateIdMap);
      await tx.documentTemplate.upsert({
        where: { id },
        update: {
          defaultKey: record.defaultKey ? String(record.defaultKey) : null,
          name: String(record.name),
          kind: record.kind,
          content: String(record.content),
          isDefault: Boolean(record.isDefault)
        },
        create: {
          id,
          userId: targetUserId,
          defaultKey: record.defaultKey ? String(record.defaultKey) : null,
          name: String(record.name),
          kind: record.kind,
          content: String(record.content),
          isDefault: Boolean(record.isDefault)
        }
      });
    }
    report.imported.push(`${parsed.data.templates.length} templates`);

    for (const record of parsed.data.incomes) {
      await tx.incomeEntry.upsert({
        where: { id: String(record.id) },
        update: {
          categoryId: categoryIdMap.get(String(record.categoryId))!,
          tenancyAgreementId: record.tenancyAgreementId ? tenancyIdMap.get(String(record.tenancyAgreementId)) ?? null : null,
          amount: parseDecimal(record.amount)!,
          paymentDate: parseDate(record.paymentDate)!,
          notes: record.notes ? String(record.notes) : null
        },
        create: {
          id: String(record.id),
          userId: targetUserId,
          categoryId: categoryIdMap.get(String(record.categoryId))!,
          tenancyAgreementId: record.tenancyAgreementId ? tenancyIdMap.get(String(record.tenancyAgreementId)) ?? null : null,
          amount: parseDecimal(record.amount)!,
          paymentDate: parseDate(record.paymentDate)!,
          notes: record.notes ? String(record.notes) : null
        }
      });
    }
    report.imported.push(`${parsed.data.incomes.length} incomes`);

    for (const record of parsed.data.expenses) {
      await tx.expenseEntry.upsert({
        where: { id: String(record.id) },
        update: {
          categoryId: categoryIdMap.get(String(record.categoryId))!,
          tenancyAgreementId: record.tenancyAgreementId ? tenancyIdMap.get(String(record.tenancyAgreementId)) ?? null : null,
          grossAmount: parseDecimal(record.grossAmount)!,
          netAmount: parseDecimal(record.netAmount)!,
          vatAmount: parseDecimal(record.vatAmount)!,
          removeVat: Boolean(record.removeVat),
          description: String(record.description),
          invoiceNumber: record.invoiceNumber ? String(record.invoiceNumber) : null,
          dueDate: parseDate(record.dueDate)!,
          supplier: String(record.supplier),
          paid: Boolean(record.paid),
          organisationExpense: Boolean(record.organisationExpense)
        },
        create: {
          id: String(record.id),
          userId: targetUserId,
          categoryId: categoryIdMap.get(String(record.categoryId))!,
          tenancyAgreementId: record.tenancyAgreementId ? tenancyIdMap.get(String(record.tenancyAgreementId)) ?? null : null,
          grossAmount: parseDecimal(record.grossAmount)!,
          netAmount: parseDecimal(record.netAmount)!,
          vatAmount: parseDecimal(record.vatAmount)!,
          removeVat: Boolean(record.removeVat),
          description: String(record.description),
          invoiceNumber: record.invoiceNumber ? String(record.invoiceNumber) : null,
          dueDate: parseDate(record.dueDate)!,
          supplier: String(record.supplier),
          paid: Boolean(record.paid),
          organisationExpense: Boolean(record.organisationExpense)
        }
      });
    }
    report.imported.push(`${parsed.data.expenses.length} expenses`);

    for (const record of parsed.data.documents) {
      const existing = await tx.documentRecord.findUnique({ where: { id: String(record.id) } });
      const id =
        !existing || existing.userId === targetUserId ? String(record.id) : crypto.randomUUID();

      await tx.documentRecord.upsert({
        where: { id },
        update: {
          templateId: record.templateId ? templateIdMap.get(String(record.templateId)) ?? null : null,
          propertyId: record.propertyId ? propertyIdMap.get(String(record.propertyId)) ?? null : null,
          tenancyAgreementId: record.tenancyAgreementId ? tenancyIdMap.get(String(record.tenancyAgreementId)) ?? null : null,
          category: record.category,
          name: String(record.name),
          fileName: String(record.fileName),
          mimeType: String(record.mimeType),
          fileSize: Number(record.fileSize),
          fileData: parseBytes(record.fileData) ?? Buffer.from(""),
          organisationDocument: Boolean(record.organisationDocument),
          metadata: record.metadata ?? null
        },
        create: {
          id,
          userId: targetUserId,
          templateId: record.templateId ? templateIdMap.get(String(record.templateId)) ?? null : null,
          propertyId: record.propertyId ? propertyIdMap.get(String(record.propertyId)) ?? null : null,
          tenancyAgreementId: record.tenancyAgreementId ? tenancyIdMap.get(String(record.tenancyAgreementId)) ?? null : null,
          category: record.category,
          name: String(record.name),
          fileName: String(record.fileName),
          mimeType: String(record.mimeType),
          fileSize: Number(record.fileSize),
          fileData: parseBytes(record.fileData) ?? Buffer.from(""),
          organisationDocument: Boolean(record.organisationDocument),
          metadata: record.metadata ?? null
        }
      });
    }
    report.imported.push(`${parsed.data.documents.length} documents`);
  });

  return report;
}
