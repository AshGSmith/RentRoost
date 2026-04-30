import { DocumentCategory, Prisma, ReminderKind } from "@prisma/client";
import { z } from "zod";

import { createAuditLog } from "@/lib/auth/audit";
import { prisma } from "@/lib/prisma";
import {
  addYears,
  advanceRecurringDate,
  buildRentReviewReminderDateTime,
  toDecimal
} from "@/lib/domain/utils";
import {
  landlordSchema,
  propertySchema,
  reminderSchema,
  rentChangeSchema,
  tenantSchema,
  tenancySchema,
  type LandlordInput,
  type PropertyInput,
  type ReminderInput,
  type RentChangeInput,
  type TenantInput,
  type TenancyInput
} from "@/lib/domain/validation";

export class DomainError extends Error {
  fieldErrors?: Record<string, string[]>;

  constructor(message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "DomainError";
    this.fieldErrors = fieldErrors;
  }
}

type DomainContext = {
  tenantUserId: string;
  actorUserId: string;
};

type TenancyDocumentInput = {
  fileName: string;
  mimeType: string;
  fileData: Buffer;
  fileSize: number;
} | null;

function validationErrorFromZod(error: z.ZodError) {
  const fieldErrors = error.issues.reduce<Record<string, string[]>>((acc, issue) => {
    const key = issue.path.join(".") || "form";
    acc[key] = [...(acc[key] ?? []), issue.message];
    return acc;
  }, {});

  return new DomainError("Please review the highlighted fields.", fieldErrors);
}

function ensureDate(value: string, fieldName: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    throw new DomainError(`${fieldName} is invalid.`, { [fieldName]: [`${fieldName} is invalid.`] });
  }
  return date;
}

async function assertOwnedLandlord(id: string | undefined, tenantUserId: string) {
  if (!id) {
    return null;
  }

  const landlord = await prisma.landlord.findFirst({
    where: { id, userId: tenantUserId }
  });

  if (!landlord) {
    throw new DomainError("Landlord not found.");
  }

  return landlord;
}

async function assertOwnedProperty(id: string, tenantUserId: string) {
  const property = await prisma.property.findFirst({
    where: { id, userId: tenantUserId }
  });

  if (!property) {
    throw new DomainError("Property not found.");
  }

  return property;
}

async function assertOwnedTenant(id: string, tenantUserId: string) {
  const tenant = await prisma.tenant.findFirst({
    where: { id, userId: tenantUserId }
  });

  if (!tenant) {
    throw new DomainError("Tenant not found.");
  }

  return tenant;
}

async function assertOwnedTenancy(id: string, tenantUserId: string) {
  const tenancy = await prisma.tenancyAgreement.findFirst({
    where: { id, userId: tenantUserId },
    include: {
      documents: {
        where: {
          category: DocumentCategory.TENANCY_AGREEMENT
        }
      }
    }
  });

  if (!tenancy) {
    throw new DomainError("Tenancy not found.");
  }

  return tenancy;
}

async function assertOwnedReminder(id: string, tenantUserId: string) {
  const reminder = await prisma.reminder.findFirst({
    where: {
      id,
      userId: tenantUserId
    }
  });

  if (!reminder) {
    throw new DomainError("Reminder not found.");
  }

  return reminder;
}

async function syncRentReviewReminder(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    tenancyAgreementId: string;
    propertyId: string;
    dueDate: Date;
    description: string;
  }
) {
  const systemGroupKey = `rent-review:${input.tenancyAgreementId}`;
  const reminderAt = buildRentReviewReminderDateTime(input.dueDate);

  const existing = await tx.reminder.findFirst({
    where: {
      userId: input.userId,
      systemGroupKey,
      isComplete: false
    }
  });

  if (existing) {
    return tx.reminder.update({
      where: {
        id: existing.id
      },
      data: {
        propertyId: input.propertyId,
        tenancyAgreementId: input.tenancyAgreementId,
        description: input.description,
        dueDate: input.dueDate,
        reminderAt,
        critical: true,
        recurring: true,
        recurringFrequency: "ANNUAL",
        kind: ReminderKind.RENT_REVIEW,
        notificationFailureAt: null,
        notificationFailureMessage: null
      }
    });
  }

  return tx.reminder.create({
    data: {
      userId: input.userId,
      propertyId: input.propertyId,
      tenancyAgreementId: input.tenancyAgreementId,
      description: input.description,
      dueDate: input.dueDate,
      reminderAt,
      critical: true,
      recurring: true,
      recurringFrequency: "ANNUAL",
      kind: ReminderKind.RENT_REVIEW,
      systemGroupKey
    }
  });
}

async function ensureTenantsBelongToUser(tenantIds: string[], tenantUserId: string) {
  if (tenantIds.length === 0) {
    return [];
  }

  const tenants = await prisma.tenant.findMany({
    where: {
      id: {
        in: tenantIds
      },
      userId: tenantUserId
    }
  });

  if (tenants.length !== new Set(tenantIds).size) {
    throw new DomainError("One or more selected tenants could not be found.");
  }

  return tenants;
}

export async function createLandlord(data: unknown, context: DomainContext) {
  const parsed = landlordSchema.safeParse(data);

  if (!parsed.success) {
    throw validationErrorFromZod(parsed.error);
  }

  const landlord = await prisma.landlord.create({
    data: {
      ...parsed.data,
      userId: context.tenantUserId
    }
  });

  await createAuditLog({
    action: "landlord.created",
    entityType: "Landlord",
    entityId: landlord.id,
    userId: context.tenantUserId,
    actorUserId: context.actorUserId
  });

  return landlord;
}

export async function updateLandlord(id: string, data: unknown, context: DomainContext) {
  const parsed = landlordSchema.safeParse(data);

  if (!parsed.success) {
    throw validationErrorFromZod(parsed.error);
  }

  await assertOwnedLandlord(id, context.tenantUserId);

  const landlord = await prisma.landlord.update({
    where: { id },
    data: parsed.data
  });

  await createAuditLog({
    action: "landlord.updated",
    entityType: "Landlord",
    entityId: landlord.id,
    userId: context.tenantUserId,
    actorUserId: context.actorUserId
  });

  return landlord;
}

export async function deleteLandlord(id: string, context: DomainContext) {
  const landlord = await assertOwnedLandlord(id, context.tenantUserId);

  if (!landlord) {
    throw new DomainError("Landlord not found.");
  }

  const dependencyCounts = await prisma.landlord.findUnique({
    where: { id: landlord.id },
    select: {
      _count: {
        select: {
          properties: true,
          tenancyAgreements: true
        }
      }
    }
  });

  if ((dependencyCounts?._count.properties ?? 0) > 0 || (dependencyCounts?._count.tenancyAgreements ?? 0) > 0) {
    throw new DomainError("Remove or reassign linked properties and tenancies before deleting this landlord.");
  }

  await prisma.landlord.delete({
    where: { id: landlord.id }
  });

  await createAuditLog({
    action: "landlord.deleted",
    entityType: "Landlord",
    entityId: landlord.id,
    userId: context.tenantUserId,
    actorUserId: context.actorUserId
  });
}

export async function createProperty(data: unknown, context: DomainContext) {
  const parsed = propertySchema.safeParse(data);

  if (!parsed.success) {
    throw validationErrorFromZod(parsed.error);
  }

  await assertOwnedLandlord(parsed.data.landlordId, context.tenantUserId);

  const property = await prisma.property.create({
    data: {
      ...parsed.data,
      userId: context.tenantUserId
    }
  });

  await createAuditLog({
    action: "property.created",
    entityType: "Property",
    entityId: property.id,
    userId: context.tenantUserId,
    actorUserId: context.actorUserId
  });

  return property;
}

export async function updateProperty(id: string, data: unknown, context: DomainContext) {
  const parsed = propertySchema.safeParse(data);

  if (!parsed.success) {
    throw validationErrorFromZod(parsed.error);
  }

  await assertOwnedProperty(id, context.tenantUserId);
  await assertOwnedLandlord(parsed.data.landlordId, context.tenantUserId);

  const property = await prisma.property.update({
    where: { id },
    data: parsed.data
  });

  await createAuditLog({
    action: "property.updated",
    entityType: "Property",
    entityId: property.id,
    userId: context.tenantUserId,
    actorUserId: context.actorUserId
  });

  return property;
}

export async function deleteProperty(id: string, context: DomainContext) {
  const property = await assertOwnedProperty(id, context.tenantUserId);
  const dependencies = await prisma.property.findUnique({
    where: { id: property.id },
    select: {
      _count: {
        select: {
          tenancyAgreements: true
        }
      }
    }
  });

  if ((dependencies?._count.tenancyAgreements ?? 0) > 0) {
    throw new DomainError("Remove linked tenancies before deleting this property.");
  }

  await prisma.property.delete({
    where: { id: property.id }
  });

  await createAuditLog({
    action: "property.deleted",
    entityType: "Property",
    entityId: property.id,
    userId: context.tenantUserId,
    actorUserId: context.actorUserId
  });
}

export async function createTenant(data: unknown, context: DomainContext) {
  const parsed = tenantSchema.safeParse(data);

  if (!parsed.success) {
    throw validationErrorFromZod(parsed.error);
  }

  const tenant = await prisma.tenant.create({
    data: {
      ...parsed.data,
      userId: context.tenantUserId
    }
  });

  await createAuditLog({
    action: "tenant.created",
    entityType: "Tenant",
    entityId: tenant.id,
    userId: context.tenantUserId,
    actorUserId: context.actorUserId
  });

  return tenant;
}

export async function updateTenant(id: string, data: unknown, context: DomainContext) {
  const parsed = tenantSchema.safeParse(data);

  if (!parsed.success) {
    throw validationErrorFromZod(parsed.error);
  }

  await assertOwnedTenant(id, context.tenantUserId);

  const tenant = await prisma.tenant.update({
    where: { id },
    data: parsed.data
  });

  await createAuditLog({
    action: "tenant.updated",
    entityType: "Tenant",
    entityId: tenant.id,
    userId: context.tenantUserId,
    actorUserId: context.actorUserId
  });

  return tenant;
}

export async function deleteTenant(id: string, context: DomainContext) {
  const tenant = await assertOwnedTenant(id, context.tenantUserId);
  const dependencies = await prisma.tenant.findUnique({
    where: { id: tenant.id },
    select: {
      _count: {
        select: {
          tenancyParticipants: true
        }
      }
    }
  });

  if ((dependencies?._count.tenancyParticipants ?? 0) > 0) {
    throw new DomainError("Remove linked tenancy agreements before deleting this tenant.");
  }

  await prisma.tenant.delete({
    where: { id: tenant.id }
  });

  await createAuditLog({
    action: "tenant.deleted",
    entityType: "Tenant",
    entityId: tenant.id,
    userId: context.tenantUserId,
    actorUserId: context.actorUserId
  });
}

function getInlineTenantInput(input: TenancyInput): TenantInput | null {
  const hasInlineData =
    Boolean(input.inlineTenant.firstName) ||
    Boolean(input.inlineTenant.surname) ||
    Boolean(input.inlineTenant.phoneNumber) ||
    Boolean(input.inlineTenant.email);

  if (!hasInlineData) {
    return null;
  }

  return {
    firstName: input.inlineTenant.firstName,
    surname: input.inlineTenant.surname,
    phoneNumber: input.inlineTenant.phoneNumber,
    email: input.inlineTenant.email || undefined
  };
}

async function uploadTenancyDocument(
  tx: Prisma.TransactionClient,
  tenancyAgreementId: string,
  propertyId: string,
  userId: string,
  document: TenancyDocumentInput
) {
  if (!document) {
    return null;
  }

  await tx.documentRecord.deleteMany({
    where: {
      userId,
      tenancyAgreementId,
      category: DocumentCategory.TENANCY_AGREEMENT
    }
  });

  return tx.documentRecord.create({
    data: {
      userId,
      propertyId,
      tenancyAgreementId,
      category: DocumentCategory.TENANCY_AGREEMENT,
      name: document.fileName,
      fileName: document.fileName,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
      fileData: document.fileData
    }
  });
}

export async function createTenancy(
  data: unknown,
  document: TenancyDocumentInput,
  context: DomainContext
) {
  const parsed = tenancySchema.safeParse(data);

  if (!parsed.success) {
    throw validationErrorFromZod(parsed.error);
  }

  const property = await assertOwnedProperty(parsed.data.propertyId, context.tenantUserId);
  const landlord = await assertOwnedLandlord(parsed.data.landlordId ?? property.landlordId ?? undefined, context.tenantUserId);
  const selectedTenants = await ensureTenantsBelongToUser(parsed.data.selectedTenantIds, context.tenantUserId);
  const inlineTenantInput = getInlineTenantInput(parsed.data);

  const tenancy = await prisma.$transaction(async (tx) => {
    const createdInlineTenant =
      inlineTenantInput &&
      (await tx.tenant.create({
        data: {
          ...inlineTenantInput,
          userId: context.tenantUserId
        }
      }));

    const tenantIds = [...selectedTenants.map((tenant) => tenant.id), ...(createdInlineTenant ? [createdInlineTenant.id] : [])];

    const startDate = ensureDate(parsed.data.startDate, "startDate");
    const rentReviewDate = parsed.data.rentReviewDate
      ? ensureDate(parsed.data.rentReviewDate, "rentReviewDate")
      : addYears(startDate, 1);

    const tenancyAgreement = await tx.tenancyAgreement.create({
      data: {
        userId: context.tenantUserId,
        propertyId: property.id,
        landlordId: landlord?.id ?? null,
        startDate,
        endDate: parsed.data.endDate ? ensureDate(parsed.data.endDate, "endDate") : null,
        paymentDay: parsed.data.paymentDay,
        depositAmount: toDecimal(parsed.data.depositAmount),
        rentReviewDate,
        tenancyParticipants: {
          create: tenantIds.map((tenantId) => ({
            userId: context.tenantUserId,
            tenantId
          }))
        },
        rentChanges: {
          create: {
            userId: context.tenantUserId,
            amount: toDecimal(parsed.data.initialRentAmount),
            effectiveDate: parsed.data.initialRentEffectiveDate
              ? ensureDate(parsed.data.initialRentEffectiveDate, "initialRentEffectiveDate")
              : startDate
          }
        }
      }
    });

    await uploadTenancyDocument(tx, tenancyAgreement.id, property.id, context.tenantUserId, document);
    await syncRentReviewReminder(tx, {
      userId: context.tenantUserId,
      tenancyAgreementId: tenancyAgreement.id,
      propertyId: property.id,
      dueDate: rentReviewDate,
      description: `Rent review due for ${property.name}`
    });

    return tenancyAgreement;
  });

  await createAuditLog({
    action: "tenancy.created",
    entityType: "TenancyAgreement",
    entityId: tenancy.id,
    userId: context.tenantUserId,
    actorUserId: context.actorUserId
  });

  return tenancy;
}

export async function updateTenancy(
  id: string,
  data: unknown,
  document: TenancyDocumentInput,
  context: DomainContext
) {
  const parsed = tenancySchema.safeParse(data);

  if (!parsed.success) {
    throw validationErrorFromZod(parsed.error);
  }

  await assertOwnedTenancy(id, context.tenantUserId);
  const property = await assertOwnedProperty(parsed.data.propertyId, context.tenantUserId);
  const landlord = await assertOwnedLandlord(parsed.data.landlordId ?? property.landlordId ?? undefined, context.tenantUserId);
  const selectedTenants = await ensureTenantsBelongToUser(parsed.data.selectedTenantIds, context.tenantUserId);
  const inlineTenantInput = getInlineTenantInput(parsed.data);

  const tenancy = await prisma.$transaction(async (tx) => {
    const createdInlineTenant =
      inlineTenantInput &&
      (await tx.tenant.create({
        data: {
          ...inlineTenantInput,
          userId: context.tenantUserId
        }
      }));

    const tenantIds = [...selectedTenants.map((tenant) => tenant.id), ...(createdInlineTenant ? [createdInlineTenant.id] : [])];
    const startDate = ensureDate(parsed.data.startDate, "startDate");
    const rentReviewDate = parsed.data.rentReviewDate
      ? ensureDate(parsed.data.rentReviewDate, "rentReviewDate")
      : addYears(startDate, 1);

    await tx.tenancyParticipant.deleteMany({
      where: {
        tenancyAgreementId: id,
        userId: context.tenantUserId
      }
    });

    const tenancyAgreement = await tx.tenancyAgreement.update({
      where: { id },
      data: {
        propertyId: property.id,
        landlordId: landlord?.id ?? null,
        startDate,
        endDate: parsed.data.endDate ? ensureDate(parsed.data.endDate, "endDate") : null,
        paymentDay: parsed.data.paymentDay,
        depositAmount: toDecimal(parsed.data.depositAmount),
        rentReviewDate,
        tenancyParticipants: {
          create: tenantIds.map((tenantId) => ({
            userId: context.tenantUserId,
            tenantId
          }))
        }
      }
    });

    if (document) {
      await uploadTenancyDocument(tx, tenancyAgreement.id, property.id, context.tenantUserId, document);
    }

    await syncRentReviewReminder(tx, {
      userId: context.tenantUserId,
      tenancyAgreementId: tenancyAgreement.id,
      propertyId: property.id,
      dueDate: rentReviewDate,
      description: `Rent review due for ${property.name}`
    });

    return tenancyAgreement;
  });

  await createAuditLog({
    action: "tenancy.updated",
    entityType: "TenancyAgreement",
    entityId: tenancy.id,
    userId: context.tenantUserId,
    actorUserId: context.actorUserId
  });

  return tenancy;
}

export async function deleteTenancy(id: string, context: DomainContext) {
  const tenancy = await assertOwnedTenancy(id, context.tenantUserId);

  await prisma.$transaction([
    prisma.reminder.deleteMany({
      where: {
        userId: context.tenantUserId,
        tenancyAgreementId: tenancy.id
      }
    }),
    prisma.tenancyAgreement.delete({
      where: { id: tenancy.id }
    })
  ]);

  await createAuditLog({
    action: "tenancy.deleted",
    entityType: "TenancyAgreement",
    entityId: tenancy.id,
    userId: context.tenantUserId,
    actorUserId: context.actorUserId
  });
}

export async function createRentChange(data: unknown, context: DomainContext) {
  const parsed = rentChangeSchema.safeParse(data);

  if (!parsed.success) {
    throw validationErrorFromZod(parsed.error);
  }

  await assertOwnedTenancy(parsed.data.tenancyAgreementId, context.tenantUserId);

  const rentChange = await prisma.rentChange.create({
    data: {
      userId: context.tenantUserId,
      tenancyAgreementId: parsed.data.tenancyAgreementId,
      amount: toDecimal(parsed.data.amount),
      effectiveDate: ensureDate(parsed.data.effectiveDate, "effectiveDate")
    }
  });

  await createAuditLog({
    action: "rent_change.created",
    entityType: "RentChange",
    entityId: rentChange.id,
    userId: context.tenantUserId,
    actorUserId: context.actorUserId
  });

  return rentChange;
}

export async function updateRentChange(id: string, data: unknown, context: DomainContext) {
  const parsed = rentChangeSchema.safeParse(data);

  if (!parsed.success) {
    throw validationErrorFromZod(parsed.error);
  }

  const existing = await prisma.rentChange.findFirst({
    where: {
      id,
      userId: context.tenantUserId
    }
  });

  if (!existing) {
    throw new DomainError("Rent change not found.");
  }

  await assertOwnedTenancy(parsed.data.tenancyAgreementId, context.tenantUserId);

  const rentChange = await prisma.rentChange.update({
    where: { id },
    data: {
      tenancyAgreementId: parsed.data.tenancyAgreementId,
      amount: toDecimal(parsed.data.amount),
      effectiveDate: ensureDate(parsed.data.effectiveDate, "effectiveDate")
    }
  });

  await createAuditLog({
    action: "rent_change.updated",
    entityType: "RentChange",
    entityId: rentChange.id,
    userId: context.tenantUserId,
    actorUserId: context.actorUserId
  });

  return rentChange;
}

export async function deleteRentChange(id: string, context: DomainContext) {
  const existing = await prisma.rentChange.findFirst({
    where: {
      id,
      userId: context.tenantUserId
    }
  });

  if (!existing) {
    throw new DomainError("Rent change not found.");
  }

  await prisma.rentChange.delete({
    where: {
      id
    }
  });

  await createAuditLog({
    action: "rent_change.deleted",
    entityType: "RentChange",
    entityId: id,
    userId: context.tenantUserId,
    actorUserId: context.actorUserId
  });
}

export async function createReminder(data: unknown, context: DomainContext) {
  const parsed = reminderSchema.safeParse(data);

  if (!parsed.success) {
    throw validationErrorFromZod(parsed.error);
  }

  if (parsed.data.propertyId) {
    await assertOwnedProperty(parsed.data.propertyId, context.tenantUserId);
  }

  if (parsed.data.tenancyAgreementId) {
    await assertOwnedTenancy(parsed.data.tenancyAgreementId, context.tenantUserId);
  }

  const reminder = await prisma.reminder.create({
    data: {
      userId: context.tenantUserId,
      propertyId: parsed.data.propertyId ?? null,
      tenancyAgreementId: parsed.data.tenancyAgreementId ?? null,
      description: parsed.data.description,
      dueDate: ensureDate(parsed.data.dueDate, "dueDate"),
      reminderAt: ensureDate(parsed.data.reminderAt, "reminderAt"),
      critical: parsed.data.critical,
      recurring: parsed.data.recurring,
      recurringFrequency: parsed.data.recurring ? parsed.data.recurringFrequency ?? null : null
    }
  });

  await createAuditLog({
    action: "reminder.created",
    entityType: "Reminder",
    entityId: reminder.id,
    userId: context.tenantUserId,
    actorUserId: context.actorUserId
  });

  return reminder;
}

export async function updateReminder(id: string, data: unknown, context: DomainContext) {
  const parsed = reminderSchema.safeParse(data);

  if (!parsed.success) {
    throw validationErrorFromZod(parsed.error);
  }

  const existing = await assertOwnedReminder(id, context.tenantUserId);

  if (parsed.data.propertyId) {
    await assertOwnedProperty(parsed.data.propertyId, context.tenantUserId);
  }

  if (parsed.data.tenancyAgreementId) {
    await assertOwnedTenancy(parsed.data.tenancyAgreementId, context.tenantUserId);
  }

  const reminder = await prisma.reminder.update({
    where: {
      id: existing.id
    },
    data: {
      propertyId: parsed.data.propertyId ?? null,
      tenancyAgreementId: parsed.data.tenancyAgreementId ?? null,
      description: parsed.data.description,
      dueDate: ensureDate(parsed.data.dueDate, "dueDate"),
      reminderAt: ensureDate(parsed.data.reminderAt, "reminderAt"),
      critical: parsed.data.critical,
      recurring: parsed.data.recurring,
      recurringFrequency: parsed.data.recurring ? parsed.data.recurringFrequency ?? null : null
    }
  });

  await createAuditLog({
    action: "reminder.updated",
    entityType: "Reminder",
    entityId: reminder.id,
    userId: context.tenantUserId,
    actorUserId: context.actorUserId
  });

  return reminder;
}

export async function deleteReminder(id: string, context: DomainContext) {
  const existing = await assertOwnedReminder(id, context.tenantUserId);

  await prisma.reminder.delete({
    where: {
      id: existing.id
    }
  });

  await createAuditLog({
    action: "reminder.deleted",
    entityType: "Reminder",
    entityId: existing.id,
    userId: context.tenantUserId,
    actorUserId: context.actorUserId
  });
}

export async function completeReminder(id: string, context: DomainContext) {
  const existing = await assertOwnedReminder(id, context.tenantUserId);

  const result = await prisma.$transaction(async (tx) => {
    const completed = await tx.reminder.update({
      where: { id: existing.id },
      data: {
        isComplete: true,
        completedAt: new Date()
      }
    });

    let nextReminder = null;

    if (existing.recurring && existing.recurringFrequency) {
      nextReminder = await tx.reminder.create({
        data: {
          userId: existing.userId,
          propertyId: existing.propertyId,
          tenancyAgreementId: existing.tenancyAgreementId,
          description: existing.description,
          dueDate: advanceRecurringDate(existing.dueDate, existing.recurringFrequency),
          reminderAt: advanceRecurringDate(existing.reminderAt, existing.recurringFrequency),
          critical: existing.critical,
          recurring: true,
          recurringFrequency: existing.recurringFrequency,
          kind: existing.kind,
          systemGroupKey: existing.systemGroupKey
        }
      });
    }

    return { completed, nextReminder };
  });

  await createAuditLog({
    action: "reminder.completed",
    entityType: "Reminder",
    entityId: existing.id,
    userId: context.tenantUserId,
    actorUserId: context.actorUserId,
    metadata: {
      nextReminderId: result.nextReminder?.id ?? null
    }
  });

  return result;
}

export async function reopenReminder(id: string, context: DomainContext) {
  const existing = await assertOwnedReminder(id, context.tenantUserId);

  const reminder = await prisma.reminder.update({
    where: { id: existing.id },
    data: {
      isComplete: false,
      completedAt: null
    }
  });

  await createAuditLog({
    action: "reminder.reopened",
    entityType: "Reminder",
    entityId: reminder.id,
    userId: context.tenantUserId,
    actorUserId: context.actorUserId
  });

  return reminder;
}

export function parseLandlordInput(raw: Record<string, FormDataEntryValue | string | null | undefined>): LandlordInput {
  return {
    name: String(raw.name ?? ""),
    email: String(raw.email ?? ""),
    phoneNumber: String(raw.phoneNumber ?? ""),
    notes: String(raw.notes ?? "")
  };
}

export function parsePropertyInput(raw: Record<string, FormDataEntryValue | string | null | undefined>): PropertyInput {
  return {
    landlordId: String(raw.landlordId ?? ""),
    name: String(raw.name ?? ""),
    addressLine1: String(raw.addressLine1 ?? ""),
    addressLine2: String(raw.addressLine2 ?? ""),
    city: String(raw.city ?? ""),
    postcode: String(raw.postcode ?? ""),
    notes: String(raw.notes ?? "")
  };
}

export function parseTenantInput(raw: Record<string, FormDataEntryValue | string | null | undefined>): TenantInput {
  return {
    firstName: String(raw.firstName ?? ""),
    surname: String(raw.surname ?? ""),
    phoneNumber: String(raw.phoneNumber ?? ""),
    email: String(raw.email ?? "")
  };
}

export function parseTenancyInput(formData: FormData): TenancyInput {
  return {
    propertyId: String(formData.get("propertyId") ?? ""),
    landlordId: String(formData.get("landlordId") ?? ""),
    startDate: String(formData.get("startDate") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
    paymentDay: Number(formData.get("paymentDay") ?? 1),
    depositAmount: String(formData.get("depositAmount") ?? ""),
    rentReviewDate: String(formData.get("rentReviewDate") ?? ""),
    selectedTenantIds: formData.getAll("selectedTenantIds").map((value) => String(value)),
    inlineTenant: {
      firstName: String(formData.get("inlineTenantFirstName") ?? ""),
      surname: String(formData.get("inlineTenantSurname") ?? ""),
      phoneNumber: String(formData.get("inlineTenantPhoneNumber") ?? ""),
      email: String(formData.get("inlineTenantEmail") ?? "")
    },
    initialRentAmount: String(formData.get("initialRentAmount") ?? ""),
    initialRentEffectiveDate: String(formData.get("initialRentEffectiveDate") ?? "")
  };
}

export function parseRentChangeInput(raw: Record<string, FormDataEntryValue | string | null | undefined>): RentChangeInput {
  return {
    tenancyAgreementId: String(raw.tenancyAgreementId ?? ""),
    amount: String(raw.amount ?? ""),
    effectiveDate: String(raw.effectiveDate ?? "")
  };
}

export function parseReminderInput(formData: FormData): ReminderInput {
  const recurringFrequency = String(formData.get("recurringFrequency") ?? "");

  return {
    description: String(formData.get("description") ?? ""),
    propertyId: String(formData.get("propertyId") ?? ""),
    tenancyAgreementId: String(formData.get("tenancyAgreementId") ?? ""),
    dueDate: String(formData.get("dueDate") ?? ""),
    reminderAt: String(formData.get("reminderAt") ?? ""),
    critical: formData.get("critical") === "on",
    recurring: formData.get("recurring") === "on",
    recurringFrequency:
      recurringFrequency === "WEEKLY" || recurringFrequency === "MONTHLY" || recurringFrequency === "ANNUAL"
        ? recurringFrequency
        : undefined
  };
}
