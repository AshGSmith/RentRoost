"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getTenantContext, getTenantSettings } from "@/lib/auth/tenant";
import { type FormState } from "@/lib/domain/form-state";
import {
  createTemplate,
  deleteTemplate,
  DocumentServiceError,
  generateTemplateDocument,
  parseTemplateGenerateInput,
  parseTemplateInput,
  updateTemplate
} from "@/lib/documents/service";

export async function createTemplateAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getTenantContext();

  try {
    const template = await createTemplate(parseTemplateInput(formData), {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });

    revalidatePath("/templates");
    redirect(`/templates/${template.id}`);
  } catch (error) {
    if (error instanceof DocumentServiceError) {
      return { message: error.message, errors: error.fieldErrors };
    }

    throw error;
  }
}

export async function updateTemplateAction(
  templateId: string,
  _: FormState,
  formData: FormData
): Promise<FormState> {
  const context = await getTenantContext();

  try {
    await updateTemplate(templateId, parseTemplateInput(formData), {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });

    revalidatePath("/templates");
    redirect(`/templates/${templateId}`);
  } catch (error) {
    if (error instanceof DocumentServiceError) {
      return { message: error.message, errors: error.fieldErrors };
    }

    throw error;
  }
}

export async function deleteTemplateAction(formData: FormData) {
  const context = await getTenantContext();
  const id = String(formData.get("id") ?? "");

  await deleteTemplate(id, {
    tenantUserId: context.tenantUserId,
    actorUserId: context.user.id
  });

  revalidatePath("/templates");
  redirect("/templates");
}

export async function generateTemplateDocumentAction(
  templateId: string,
  _: FormState,
  formData: FormData
): Promise<FormState> {
  const context = await getTenantContext();
  const { settings } = await getTenantSettings();

  try {
    const document = await generateTemplateDocument(
      templateId,
      parseTemplateGenerateInput(formData),
      {
        tenantUserId: context.tenantUserId,
        actorUserId: context.user.id
      },
      settings?.currencyDesignator ?? "£"
    );

    revalidatePath("/documents");
    revalidatePath("/templates");
    redirect(`/documents/${document.id}`);
  } catch (error) {
    if (error instanceof DocumentServiceError) {
      return { message: error.message, errors: error.fieldErrors };
    }

    throw error;
  }
}
