"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { EMPTY_FORM_STATE, type FormState } from "@/lib/domain/form-state";
import { DomainError, createLandlord, deleteLandlord, parseLandlordInput, updateLandlord } from "@/lib/domain/services";
import { getTenantContext } from "@/lib/auth/tenant";

export async function createLandlordAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getTenantContext();

  try {
    const landlord = await createLandlord(
      parseLandlordInput({
        name: formData.get("name"),
        email: formData.get("email"),
        phoneNumber: formData.get("phoneNumber"),
        notes: formData.get("notes")
      }),
      {
        tenantUserId: context.tenantUserId,
        actorUserId: context.user.id
      }
    );

    revalidatePath("/landlords");
    redirect(`/landlords/${landlord.id}`);
  } catch (error) {
    if (error instanceof DomainError) {
      return {
        message: error.message,
        errors: error.fieldErrors
      };
    }
    throw error;
  }
}

export async function updateLandlordAction(id: string, _: FormState, formData: FormData): Promise<FormState> {
  const context = await getTenantContext();

  try {
    const landlord = await updateLandlord(
      id,
      parseLandlordInput({
        name: formData.get("name"),
        email: formData.get("email"),
        phoneNumber: formData.get("phoneNumber"),
        notes: formData.get("notes")
      }),
      {
        tenantUserId: context.tenantUserId,
        actorUserId: context.user.id
      }
    );

    revalidatePath("/landlords");
    redirect(`/landlords/${landlord.id}`);
  } catch (error) {
    if (error instanceof DomainError) {
      return {
        message: error.message,
        errors: error.fieldErrors
      };
    }
    throw error;
  }
}

export async function deleteLandlordAction(formData: FormData) {
  const context = await getTenantContext();
  const id = String(formData.get("id") ?? "");

  try {
    await deleteLandlord(id, {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });
    revalidatePath("/landlords");
    redirect("/landlords");
  } catch (error) {
    if (error instanceof DomainError) {
      redirect(`/landlords/${id}?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }
}
