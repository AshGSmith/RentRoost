"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getTenantContext } from "@/lib/auth/tenant";
import { type FormState } from "@/lib/domain/form-state";
import {
  completeReminder,
  createReminder,
  deleteReminder,
  parseReminderInput,
  reopenReminder,
  updateReminder,
  DomainError
} from "@/lib/domain/services";

export async function createReminderAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getTenantContext();

  try {
    const reminder = await createReminder(parseReminderInput(formData), {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });

    revalidatePath("/reminders");
    redirect(`/reminders/${reminder.id}`);
  } catch (error) {
    if (error instanceof DomainError) {
      return { message: error.message, errors: error.fieldErrors };
    }
    throw error;
  }
}

export async function updateReminderAction(id: string, _: FormState, formData: FormData): Promise<FormState> {
  const context = await getTenantContext();

  try {
    const reminder = await updateReminder(id, parseReminderInput(formData), {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });

    revalidatePath("/reminders");
    redirect(`/reminders/${reminder.id}`);
  } catch (error) {
    if (error instanceof DomainError) {
      return { message: error.message, errors: error.fieldErrors };
    }
    throw error;
  }
}

export async function completeReminderAction(formData: FormData) {
  const context = await getTenantContext();
  const id = String(formData.get("id") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/reminders");

  await completeReminder(id, {
    tenantUserId: context.tenantUserId,
    actorUserId: context.user.id
  });

  revalidatePath("/reminders");
  revalidatePath("/dashboard");
  redirect(redirectTo);
}

export async function reopenReminderAction(formData: FormData) {
  const context = await getTenantContext();
  const id = String(formData.get("id") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/reminders");

  await reopenReminder(id, {
    tenantUserId: context.tenantUserId,
    actorUserId: context.user.id
  });

  revalidatePath("/reminders");
  revalidatePath("/dashboard");
  redirect(redirectTo);
}

export async function deleteReminderAction(formData: FormData) {
  const context = await getTenantContext();
  const id = String(formData.get("id") ?? "");

  await deleteReminder(id, {
    tenantUserId: context.tenantUserId,
    actorUserId: context.user.id
  });

  revalidatePath("/reminders");
  redirect("/reminders");
}
