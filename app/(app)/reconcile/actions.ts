"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getTenantContext } from "@/lib/auth/tenant";
import { type FormState } from "@/lib/domain/form-state";
import {
  applySuggestedRule,
  buildBankAccountLinkUrl,
  createBankAccount,
  createManualTransaction,
  createReconciliationRule,
  deleteBankAccount,
  deleteReconciliationRule,
  ignoreTransaction,
  parseBankAccountInput,
  parseManualTransactionInput,
  parseReconcileExpenseInput,
  parseReconcileIncomeInput,
  parseRuleInput,
  parseUserAutoReconcileInput,
  reconcileTransactionAsExpense,
  reconcileTransactionAsIncome,
  ReconcileError,
  syncBankAccountTransactions,
  updateBankAccount,
  updateReconciliationRule,
  updateUserAutoReconcileSettings
} from "@/lib/reconcile/service";

export async function createBankAccountAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getTenantContext();

  try {
    const account = await createBankAccount(parseBankAccountInput(formData), {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });
    revalidatePath("/reconcile");
    redirect(`/reconcile/${account.id}`);
  } catch (error) {
    if (error instanceof ReconcileError) return { message: error.message, errors: error.fieldErrors };
    throw error;
  }
}

export async function updateBankAccountAction(id: string, _: FormState, formData: FormData): Promise<FormState> {
  const context = await getTenantContext();

  try {
    const account = await updateBankAccount(id, parseBankAccountInput(formData), {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });
    revalidatePath("/reconcile");
    redirect(`/reconcile/${account.id}`);
  } catch (error) {
    if (error instanceof ReconcileError) return { message: error.message, errors: error.fieldErrors };
    throw error;
  }
}

export async function deleteBankAccountAction(formData: FormData) {
  const context = await getTenantContext();
  const id = String(formData.get("id") ?? "");

  await deleteBankAccount(id, {
    tenantUserId: context.tenantUserId,
    actorUserId: context.user.id
  });

  revalidatePath("/reconcile");
  redirect("/reconcile");
}

export async function connectBankAccountAction(formData: FormData) {
  const context = await getTenantContext();
  const id = String(formData.get("id") ?? "");

  const url = await buildBankAccountLinkUrl(id, {
    tenantUserId: context.tenantUserId,
    actorUserId: context.user.id
  });

  redirect(url);
}

export async function syncBankAccountAction(formData: FormData) {
  const context = await getTenantContext();
  const id = String(formData.get("id") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? `/reconcile/${id}`);

  await syncBankAccountTransactions(
    id,
    {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    },
    {
      actorUserId: context.user.id,
      reason: "manual"
    }
  );

  revalidatePath("/reconcile");
  revalidatePath("/cashflow");
  redirect(redirectTo);
}

export async function updateUserAutoReconcileAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getTenantContext();

  try {
    await updateUserAutoReconcileSettings(parseUserAutoReconcileInput(formData), {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });
    revalidatePath("/reconcile");
    redirect("/reconcile");
  } catch (error) {
    if (error instanceof ReconcileError) return { message: error.message, errors: error.fieldErrors };
    throw error;
  }
}

export async function createManualTransactionAction(
  bankAccountId: string,
  _: FormState,
  formData: FormData
): Promise<FormState> {
  const context = await getTenantContext();

  try {
    await createManualTransaction(bankAccountId, parseManualTransactionInput(formData), {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });
    revalidatePath("/reconcile");
    redirect(`/reconcile/${bankAccountId}?tab=review`);
  } catch (error) {
    if (error instanceof ReconcileError) return { message: error.message, errors: error.fieldErrors };
    throw error;
  }
}

export async function createRuleAction(
  bankAccountId: string | null,
  _: FormState,
  formData: FormData
): Promise<FormState> {
  const context = await getTenantContext();

  try {
    await createReconciliationRule(bankAccountId ?? undefined, parseRuleInput(formData), {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });
    revalidatePath("/reconcile");
    redirect(bankAccountId ? `/reconcile/${bankAccountId}?tab=review` : "/reconcile");
  } catch (error) {
    if (error instanceof ReconcileError) return { message: error.message, errors: error.fieldErrors };
    throw error;
  }
}

export async function updateRuleAction(
  bankAccountId: string | null,
  ruleId: string,
  _: FormState,
  formData: FormData
): Promise<FormState> {
  const context = await getTenantContext();

  try {
    await updateReconciliationRule(ruleId, parseRuleInput(formData), {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });
    revalidatePath("/reconcile");
    redirect(bankAccountId ? `/reconcile/${bankAccountId}?tab=review` : "/reconcile");
  } catch (error) {
    if (error instanceof ReconcileError) return { message: error.message, errors: error.fieldErrors };
    throw error;
  }
}

export async function deleteRuleAction(formData: FormData) {
  const context = await getTenantContext();
  const id = String(formData.get("id") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/reconcile");

  await deleteReconciliationRule(id, {
    tenantUserId: context.tenantUserId,
    actorUserId: context.user.id
  });

  revalidatePath("/reconcile");
  redirect(redirectTo);
}

export async function ignoreTransactionAction(formData: FormData) {
  const context = await getTenantContext();
  const transactionId = String(formData.get("transactionId") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/reconcile");

  await ignoreTransaction(transactionId, {
    tenantUserId: context.tenantUserId,
    actorUserId: context.user.id
  });

  revalidatePath("/reconcile");
  revalidatePath("/cashflow");
  redirect(redirectTo);
}

export async function applySuggestedRuleAction(formData: FormData) {
  const context = await getTenantContext();
  const transactionId = String(formData.get("transactionId") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/reconcile");

  await applySuggestedRule(transactionId, {
    tenantUserId: context.tenantUserId,
    actorUserId: context.user.id
  });

  revalidatePath("/reconcile");
  revalidatePath("/cashflow");
  redirect(redirectTo);
}

export async function reconcileTransactionAsIncomeAction(
  transactionId: string,
  _: FormState,
  formData: FormData
): Promise<FormState> {
  const context = await getTenantContext();

  try {
    await reconcileTransactionAsIncome(transactionId, parseReconcileIncomeInput(formData), {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });
    revalidatePath("/reconcile");
    revalidatePath("/cashflow");
    redirect(String(formData.get("redirectTo") ?? "/reconcile"));
  } catch (error) {
    if (error instanceof ReconcileError || error instanceof Error) {
      return {
        message: error.message,
        errors: error instanceof ReconcileError ? error.fieldErrors : undefined
      };
    }
    throw error;
  }
}

export async function reconcileTransactionAsExpenseAction(
  transactionId: string,
  _: FormState,
  formData: FormData
): Promise<FormState> {
  const context = await getTenantContext();

  try {
    await reconcileTransactionAsExpense(transactionId, parseReconcileExpenseInput(formData), {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });
    revalidatePath("/reconcile");
    revalidatePath("/cashflow");
    redirect(String(formData.get("redirectTo") ?? "/reconcile"));
  } catch (error) {
    if (error instanceof ReconcileError || error instanceof Error) {
      return {
        message: error.message,
        errors: error instanceof ReconcileError ? error.fieldErrors : undefined
      };
    }
    throw error;
  }
}
