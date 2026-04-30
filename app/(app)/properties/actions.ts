"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getTenantContext } from "@/lib/auth/tenant";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/domain/form-state";
import { DomainError, createProperty, deleteProperty, parsePropertyInput, updateProperty } from "@/lib/domain/services";

export async function createPropertyAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getTenantContext();

  try {
    const property = await createProperty(
      parsePropertyInput({
        landlordId: formData.get("landlordId"),
        name: formData.get("name"),
        addressLine1: formData.get("addressLine1"),
        addressLine2: formData.get("addressLine2"),
        city: formData.get("city"),
        postcode: formData.get("postcode"),
        notes: formData.get("notes")
      }),
      {
        tenantUserId: context.tenantUserId,
        actorUserId: context.user.id
      }
    );

    revalidatePath("/properties");
    redirect(`/properties/${property.id}`);
  } catch (error) {
    if (error instanceof DomainError) {
      return { message: error.message, errors: error.fieldErrors };
    }
    throw error;
  }
}

export async function updatePropertyAction(id: string, _: FormState, formData: FormData): Promise<FormState> {
  const context = await getTenantContext();

  try {
    const property = await updateProperty(
      id,
      parsePropertyInput({
        landlordId: formData.get("landlordId"),
        name: formData.get("name"),
        addressLine1: formData.get("addressLine1"),
        addressLine2: formData.get("addressLine2"),
        city: formData.get("city"),
        postcode: formData.get("postcode"),
        notes: formData.get("notes")
      }),
      {
        tenantUserId: context.tenantUserId,
        actorUserId: context.user.id
      }
    );

    revalidatePath("/properties");
    redirect(`/properties/${property.id}`);
  } catch (error) {
    if (error instanceof DomainError) {
      return { message: error.message, errors: error.fieldErrors };
    }
    throw error;
  }
}

export async function deletePropertyAction(formData: FormData) {
  const context = await getTenantContext();
  const id = String(formData.get("id") ?? "");

  try {
    await deleteProperty(id, {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });
    revalidatePath("/properties");
    redirect("/properties");
  } catch (error) {
    if (error instanceof DomainError) {
      redirect(`/properties/${id}?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }
}
