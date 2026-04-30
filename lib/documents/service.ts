import { DocumentCategory, Prisma, TemplateKind } from "@prisma/client";
import { z } from "zod";

import { createAuditLog } from "@/lib/auth/audit";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/domain/utils";
import { DEFAULT_TEMPLATES } from "@/lib/templates/defaults";
import { buildTemplatePdf } from "@/lib/templates/pdf";

export class DocumentServiceError extends Error {
  fieldErrors?: Record<string, string[]>;

  constructor(message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "DocumentServiceError";
    this.fieldErrors = fieldErrors;
  }
}

type ServiceContext = {
  tenantUserId: string;
  actorUserId: string;
};

const uploadDocumentSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  propertyId: z.string().optional().transform((value) => value || undefined),
  tenancyAgreementId: z.string().optional().transform((value) => value || undefined),
  organisationDocument: z.boolean().default(false)
});

const templateSchema = z.object({
  name: z.string().trim().min(1, "Template name is required."),
  content: z.string().trim().min(1, "Template content is required.")
});

const templateGenerateSchema = z.object({
  tenancyAgreementId: z.string().optional().transform((value) => value || undefined),
  propertyId: z.string().optional().transform((value) => value || undefined)
});

function validationErrorFromZod(error: z.ZodError) {
  const fieldErrors = error.issues.reduce<Record<string, string[]>>((acc, issue) => {
    const key = issue.path.join(".") || "form";
    acc[key] = [...(acc[key] ?? []), issue.message];
    return acc;
  }, {});

  return new DocumentServiceError("Please review the highlighted fields.", fieldErrors);
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function getCurrentRentAmount(tenancy: {
  rentChanges: { amount: Prisma.Decimal; effectiveDate: Date }[];
}) {
  const today = new Date();
  const effective = tenancy.rentChanges.find((change) => change.effectiveDate <= today) ?? tenancy.rentChanges[0] ?? null;
  return effective?.amount ?? new Prisma.Decimal(0);
}

async function assertOwnedProperty(id: string | undefined, userId: string) {
  if (!id) return null;
  const property = await prisma.property.findFirst({ where: { id, userId } });
  if (!property) throw new DocumentServiceError("Property not found.");
  return property;
}

async function assertOwnedTenancy(id: string | undefined, userId: string) {
  if (!id) return null;
  const tenancy = await prisma.tenancyAgreement.findFirst({
    where: { id, userId },
    include: {
      property: true,
      rentChanges: {
        orderBy: [{ effectiveDate: "desc" }, { createdAt: "desc" }]
      },
      tenancyParticipants: {
        include: {
          tenant: true
        },
        orderBy: [{ createdAt: "asc" }]
      }
    }
  });
  if (!tenancy) throw new DocumentServiceError("Tenancy not found.");
  return tenancy;
}

async function assertOwnedTemplate(id: string, userId: string) {
  await ensureDefaultTemplates(userId);
  const template = await prisma.documentTemplate.findFirst({
    where: { id, userId }
  });
  if (!template) throw new DocumentServiceError("Template not found.");
  return template;
}

export async function ensureDefaultTemplates(userId: string) {
  await Promise.all(
    DEFAULT_TEMPLATES.map((template) =>
      prisma.documentTemplate.upsert({
        where: {
          userId_defaultKey: {
            userId,
            defaultKey: template.defaultKey
          }
        },
        update: {
          name: template.name,
          content: template.content,
          isDefault: true
        },
        create: {
          userId,
          defaultKey: template.defaultKey,
          kind: template.kind,
          name: template.name,
          content: template.content,
          isDefault: true
        }
      })
    )
  );
}

export async function listDocumentsForUser(userId: string) {
  return prisma.documentRecord.findMany({
    where: { userId },
    include: {
      template: true,
      property: true,
      tenancyAgreement: {
        include: {
          property: true
        }
      }
    },
    orderBy: [{ createdAt: "desc" }]
  });
}

export async function getDocumentForUser(userId: string, id: string) {
  return prisma.documentRecord.findFirst({
    where: { id, userId },
    include: {
      template: true,
      property: true,
      tenancyAgreement: {
        include: {
          property: true
        }
      }
    }
  });
}

export async function getDocumentReferences(userId: string) {
  const [properties, tenancies] = await Promise.all([
    prisma.property.findMany({
      where: { userId },
      orderBy: { name: "asc" }
    }),
    prisma.tenancyAgreement.findMany({
      where: { userId },
      include: {
        property: true
      },
      orderBy: [{ startDate: "desc" }]
    })
  ]);

  return { properties, tenancies };
}

export async function uploadDocument(
  input: unknown,
  file: { fileName: string; mimeType: string; fileSize: number; fileData: Buffer },
  context: ServiceContext
) {
  const parsed = uploadDocumentSchema.safeParse(input);
  if (!parsed.success) throw validationErrorFromZod(parsed.error);

  const property = await assertOwnedProperty(parsed.data.propertyId, context.tenantUserId);
  const tenancy = await assertOwnedTenancy(parsed.data.tenancyAgreementId, context.tenantUserId);

  const document = await prisma.documentRecord.create({
    data: {
      userId: context.tenantUserId,
      propertyId: tenancy?.propertyId ?? property?.id ?? null,
      tenancyAgreementId: tenancy?.id ?? null,
      category: DocumentCategory.GENERAL,
      name: parsed.data.name,
      fileName: file.fileName,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
      fileData: file.fileData,
      organisationDocument: parsed.data.organisationDocument,
      metadata: {
        source: "upload"
      }
    }
  });

  await createAuditLog({
    action: "document.uploaded",
    entityType: "DocumentRecord",
    entityId: document.id,
    userId: context.tenantUserId,
    actorUserId: context.actorUserId
  });

  return document;
}

export async function listTemplatesForUser(userId: string) {
  await ensureDefaultTemplates(userId);

  return prisma.documentTemplate.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }]
  });
}

export async function getTemplateForUser(userId: string, id: string) {
  await ensureDefaultTemplates(userId);

  return prisma.documentTemplate.findFirst({
    where: { id, userId }
  });
}

export async function createTemplate(input: unknown, context: ServiceContext) {
  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) throw validationErrorFromZod(parsed.error);

  const template = await prisma.documentTemplate.create({
    data: {
      userId: context.tenantUserId,
      kind: TemplateKind.CUSTOM,
      name: parsed.data.name,
      content: parsed.data.content,
      isDefault: false
    }
  });

  await createAuditLog({
    action: "template.created",
    entityType: "DocumentTemplate",
    entityId: template.id,
    userId: context.tenantUserId,
    actorUserId: context.actorUserId
  });

  return template;
}

export async function updateTemplate(id: string, input: unknown, context: ServiceContext) {
  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) throw validationErrorFromZod(parsed.error);

  const existing = await assertOwnedTemplate(id, context.tenantUserId);

  const template = await prisma.documentTemplate.update({
    where: { id: existing.id },
    data: {
      name: parsed.data.name,
      content: parsed.data.content
    }
  });

  await createAuditLog({
    action: "template.updated",
    entityType: "DocumentTemplate",
    entityId: template.id,
    userId: context.tenantUserId,
    actorUserId: context.actorUserId
  });

  return template;
}

export async function deleteTemplate(id: string, context: ServiceContext) {
  const existing = await assertOwnedTemplate(id, context.tenantUserId);
  await prisma.documentTemplate.delete({ where: { id: existing.id } });
}

function replaceMergeFields(content: string, values: Record<string, string>) {
  return content.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, key: string) => values[key] ?? "");
}

export async function buildTemplatePreviewData(
  templateId: string,
  input: unknown,
  userId: string,
  currencyDesignator = "£"
) {
  const parsed = templateGenerateSchema.safeParse(input);
  if (!parsed.success) throw validationErrorFromZod(parsed.error);

  const template = await assertOwnedTemplate(templateId, userId);
  const tenancy = await assertOwnedTenancy(parsed.data.tenancyAgreementId, userId);
  const property = tenancy?.property ?? (await assertOwnedProperty(parsed.data.propertyId, userId));
  const organisation = await prisma.organisationSettings.findUnique({ where: { userId } });

  const primaryTenant = tenancy?.tenancyParticipants[0]?.tenant ?? null;
  const tenantNames = tenancy?.tenancyParticipants.map((participant) => `${participant.tenant.firstName} ${participant.tenant.surname}`) ?? [];
  const currentRent = tenancy ? getCurrentRentAmount(tenancy) : new Prisma.Decimal(0);

  const mergeValues: Record<string, string> = {
    "organisation.name": organisation?.organisationName ?? "",
    "organisation.contactName": organisation?.contactName ?? "",
    "organisation.contactNumber": organisation?.contactNumber ?? "",
    "organisation.contactEmail": organisation?.contactEmail ?? "",
    "organisation.bankName": organisation?.bankName ?? "",
    "organisation.bankSortCode": organisation?.bankSortCode ?? "",
    "organisation.bankAccountNumber": organisation?.bankAccountNumber ?? "",
    "organisation.bankAccountName": organisation?.bankAccountName ?? "",
    "property.name": property?.name ?? "",
    "property.addressLine1": property?.addressLine1 ?? "",
    "property.addressLine2": property?.addressLine2 ?? "",
    "property.city": property?.city ?? "",
    "property.postcode": property?.postcode ?? "",
    "tenant.firstName": primaryTenant?.firstName ?? "",
    "tenant.surname": primaryTenant?.surname ?? "",
    "tenant.fullName": primaryTenant ? `${primaryTenant.firstName} ${primaryTenant.surname}` : "",
    "tenant.phoneNumber": primaryTenant?.phoneNumber ?? "",
    "tenant.email": primaryTenant?.email ?? "",
    "tenants.fullNames": tenantNames.join(", "),
    "tenancy.startDate": tenancy ? formatDate(tenancy.startDate) : "",
    "tenancy.endDate": tenancy?.endDate ? formatDate(tenancy.endDate) : "",
    "tenancy.paymentDay": tenancy ? String(tenancy.paymentDay) : "",
    "tenancy.depositAmount": tenancy ? formatCurrency(tenancy.depositAmount, currencyDesignator) : "",
    "tenancy.rentReviewDate": tenancy ? formatDate(tenancy.rentReviewDate) : "",
    "tenancy.currentRent": tenancy ? formatCurrency(currentRent, currencyDesignator) : ""
  };

  const renderedText = replaceMergeFields(template.content, mergeValues);

  return {
    template,
    organisation,
    property,
    tenancy,
    renderedText
  };
}

function buildDocLikeHtml(input: {
  title: string;
  organisationName: string;
  logoDataUrl?: string | null;
  renderedText: string;
}) {
  const paragraphs = input.renderedText
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br />")}</p>`)
    .join("");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${input.title}</title>
    <style>
      body { font-family: Georgia, serif; color: #10213b; margin: 40px; }
      header { border-bottom: 3px solid #2563eb; padding-bottom: 16px; margin-bottom: 28px; display:flex; align-items:center; justify-content:space-between; gap:24px; }
      h1 { font-size: 24px; margin: 0; }
      p { font-size: 14px; line-height: 1.7; margin: 0 0 14px; }
      img { max-height: 72px; }
      .muted { color:#4b6284; font-size:12px; }
    </style>
  </head>
  <body>
    <header>
      <div>
        <h1>${input.organisationName}</h1>
        <div class="muted">${input.title}</div>
      </div>
      ${input.logoDataUrl ? `<img src="${input.logoDataUrl}" alt="Organisation logo" />` : ""}
    </header>
    ${paragraphs}
  </body>
</html>`;
}

export async function generateTemplateDocument(
  templateId: string,
  input: unknown,
  context: ServiceContext,
  currencyDesignator = "£"
) {
  const preview = await buildTemplatePreviewData(templateId, input, context.tenantUserId, currencyDesignator);
  const logoDataUrl =
    preview.organisation?.logoData && preview.organisation?.logoMimeType
      ? `data:${preview.organisation.logoMimeType};base64,${Buffer.from(preview.organisation.logoData).toString("base64")}`
      : null;

  const pdfBuffer = buildTemplatePdf({
    title: preview.template.name,
    organisationName: preview.organisation?.organisationName ?? "RentRoost",
    logoData: preview.organisation?.logoData ?? null,
    logoMimeType: preview.organisation?.logoMimeType ?? null,
    renderedText: preview.renderedText
  });

  const baseName = `${preview.template.name} ${new Date().toISOString().slice(0, 10)}`;
  const document = await prisma.documentRecord.create({
    data: {
      userId: context.tenantUserId,
      templateId: preview.template.id,
      propertyId: preview.property?.id ?? null,
      tenancyAgreementId: preview.tenancy?.id ?? null,
      category: DocumentCategory.GENERATED_TEMPLATE,
      name: baseName,
      fileName: `${slugify(baseName) || "generated-document"}.pdf`,
      mimeType: "application/pdf",
      fileSize: pdfBuffer.length,
      fileData: pdfBuffer,
      organisationDocument: !preview.property && !preview.tenancy,
      metadata: {
        generatedFromTemplate: preview.template.name,
        docLikeHtml: buildDocLikeHtml({
          title: preview.template.name,
          organisationName: preview.organisation?.organisationName ?? "RentRoost",
          logoDataUrl,
          renderedText: preview.renderedText
        })
      }
    }
  });

  await createAuditLog({
    action: "template.generated",
    entityType: "DocumentRecord",
    entityId: document.id,
    userId: context.tenantUserId,
    actorUserId: context.actorUserId
  });

  return document;
}

export function parseUploadDocumentInput(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    propertyId: String(formData.get("propertyId") ?? ""),
    tenancyAgreementId: String(formData.get("tenancyAgreementId") ?? ""),
    organisationDocument: formData.get("organisationDocument") === "on"
  };
}

export function parseTemplateInput(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    content: String(formData.get("content") ?? "")
  };
}

export function parseTemplateGenerateInput(formData: FormData) {
  return {
    tenancyAgreementId: String(formData.get("tenancyAgreementId") ?? ""),
    propertyId: String(formData.get("propertyId") ?? "")
  };
}
