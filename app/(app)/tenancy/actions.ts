"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getTenantContext } from "@/lib/auth/tenant";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/domain/form-state";
import {
  DomainError,
  createRentChange,
  createTenancy,
  deleteRentChange,
  deleteTenancy,
  parseRentChangeInput,
  parseTenancyInput,
  updateRentChange,
  updateTenancy
} from "@/lib/domain/services";

async function parseDocumentInput(formData: FormData) {
  const file = formData.get("agreementDocument");

  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new DomainError("Tenancy agreement documents must be 5MB or smaller.", {
      agreementDocument: ["Tenancy agreement documents must be 5MB or smaller."]
    });
  }

  return {
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    fileSize: file.size,
    fileData: Buffer.from(await file.arrayBuffer())
  };
}

export async function createTenancyAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getTenantContext();

  try {
    const tenancy = await createTenancy(parseTenancyInput(formData), await parseDocumentInput(formData), {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });

    revalidatePath("/tenancy");
    redirect(`/tenancy/${tenancy.id}`);
  } catch (error) {
    if (error instanceof DomainError) {
      return { message: error.message, errors: error.fieldErrors };
    }
    throw error;
  }
}

export async function updateTenancyAction(id: string, _: FormState, formData: FormData): Promise<FormState> {
  const context = await getTenantContext();

  try {
    const tenancy = await updateTenancy(id, parseTenancyInput(formData), await parseDocumentInput(formData), {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });

    revalidatePath("/tenancy");
    redirect(`/tenancy/${tenancy.id}`);
  } catch (error) {
    if (error instanceof DomainError) {
      return { message: error.message, errors: error.fieldErrors };
    }
    throw error;
  }
}

export async function deleteTenancyAction(formData: FormData) {
  const context = await getTenantContext();
  const id = String(formData.get("id") ?? "");

  try {
    await deleteTenancy(id, {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });
    revalidatePath("/tenancy");
    redirect("/tenancy");
  } catch (error) {
    if (error instanceof DomainError) {
      redirect(`/tenancy/${id}?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }
}

export async function createRentChangeAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getTenantContext();

  try {
    const rentChange = await createRentChange(
      parseRentChangeInput({
        tenancyAgreementId: formData.get("tenancyAgreementId"),
        amount: formData.get("amount"),
        effectiveDate: formData.get("effectiveDate")
      }),
      {
        tenantUserId: context.tenantUserId,
        actorUserId: context.user.id
      }
    );

    revalidatePath("/tenancy");
    redirect(`/tenancy/${rentChange.tenancyAgreementId}`);
  } catch (error) {
    if (error instanceof DomainError) {
      return { message: error.message, errors: error.fieldErrors };
    }
    throw error;
  }
}

export async function updateRentChangeAction(id: string, _: FormState, formData: FormData): Promise<FormState> {
  const context = await getTenantContext();

  try {
    const rentChange = await updateRentChange(
      id,
      parseRentChangeInput({
        tenancyAgreementId: formData.get("tenancyAgreementId"),
        amount: formData.get("amount"),
        effectiveDate: formData.get("effectiveDate")
      }),
      {
        tenantUserId: context.tenantUserId,
        actorUserId: context.user.id
      }
    );

    revalidatePath("/tenancy");
    redirect(`/tenancy/${rentChange.tenancyAgreementId}`);
  } catch (error) {
    if (error instanceof DomainError) {
      return { message: error.message, errors: error.fieldErrors };
    }
    throw error;
  }
}

export async function deleteRentChangeAction(formData: FormData) {
  const context = await getTenantContext();
  const id = String(formData.get("id") ?? "");
  const tenancyAgreementId = String(formData.get("tenancyAgreementId") ?? "");

  try {
    await deleteRentChange(id, {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });
    revalidatePath("/tenancy");
    redirect(`/tenancy/${tenancyAgreementId}`);
  } catch (error) {
    if (error instanceof DomainError) {
      redirect(`/tenancy/${tenancyAgreementId}?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }
}
