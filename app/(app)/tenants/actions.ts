"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getTenantContext } from "@/lib/auth/tenant";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/domain/form-state";
import { DomainError, createTenant, deleteTenant, parseTenantInput, updateTenant } from "@/lib/domain/services";

export async function createTenantAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getTenantContext();

  try {
    const tenant = await createTenant(
      parseTenantInput({
        firstName: formData.get("firstName"),
        surname: formData.get("surname"),
        phoneNumber: formData.get("phoneNumber"),
        email: formData.get("email")
      }),
      {
        tenantUserId: context.tenantUserId,
        actorUserId: context.user.id
      }
    );

    revalidatePath("/tenants");
    redirect(`/tenants/${tenant.id}`);
  } catch (error) {
    if (error instanceof DomainError) {
      return { message: error.message, errors: error.fieldErrors };
    }
    throw error;
  }
}

export async function updateTenantAction(id: string, _: FormState, formData: FormData): Promise<FormState> {
  const context = await getTenantContext();

  try {
    const tenant = await updateTenant(
      id,
      parseTenantInput({
        firstName: formData.get("firstName"),
        surname: formData.get("surname"),
        phoneNumber: formData.get("phoneNumber"),
        email: formData.get("email")
      }),
      {
        tenantUserId: context.tenantUserId,
        actorUserId: context.user.id
      }
    );

    revalidatePath("/tenants");
    redirect(`/tenants/${tenant.id}`);
  } catch (error) {
    if (error instanceof DomainError) {
      return { message: error.message, errors: error.fieldErrors };
    }
    throw error;
  }
}

export async function deleteTenantAction(formData: FormData) {
  const context = await getTenantContext();
  const id = String(formData.get("id") ?? "");

  try {
    await deleteTenant(id, {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });
    revalidatePath("/tenants");
    redirect("/tenants");
  } catch (error) {
    if (error instanceof DomainError) {
      redirect(`/tenants/${id}?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }
}
