"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getTenantContext } from "@/lib/auth/tenant";
import { type FormState } from "@/lib/domain/form-state";
import {
  FinanceError,
  createCashflowCategory,
  createExpense,
  createIncome,
  deleteCashflowCategory,
  deleteExpense,
  deleteIncome,
  parseCategoryInput,
  parseExpenseInput,
  parseIncomeInput,
  updateExpense,
  updateIncome
} from "@/lib/finance/service";

export async function createCategoryAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getTenantContext();

  try {
    await createCashflowCategory(parseCategoryInput(formData), {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });

    revalidatePath("/cashflow");
    redirect(`/cashflow/categories?type=${String(formData.get("type") ?? "INCOME")}`);
  } catch (error) {
    if (error instanceof FinanceError) {
      return { message: error.message, errors: error.fieldErrors };
    }
    throw error;
  }
}

export async function deleteCategoryAction(formData: FormData) {
  const context = await getTenantContext();
  const id = String(formData.get("id") ?? "");
  const type = String(formData.get("type") ?? "INCOME");

  try {
    await deleteCashflowCategory(id, {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });
    revalidatePath("/cashflow");
    redirect(`/cashflow/categories?type=${type}`);
  } catch (error) {
    if (error instanceof FinanceError) {
      redirect(`/cashflow/categories?type=${type}&error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }
}

export async function createIncomeAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getTenantContext();

  try {
    const income = await createIncome(parseIncomeInput(formData), {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });

    revalidatePath("/cashflow");
    redirect(`/cashflow/income/${income.id}`);
  } catch (error) {
    if (error instanceof FinanceError) {
      return { message: error.message, errors: error.fieldErrors };
    }
    throw error;
  }
}

export async function updateIncomeAction(id: string, _: FormState, formData: FormData): Promise<FormState> {
  const context = await getTenantContext();

  try {
    const income = await updateIncome(id, parseIncomeInput(formData), {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });

    revalidatePath("/cashflow");
    redirect(`/cashflow/income/${income.id}`);
  } catch (error) {
    if (error instanceof FinanceError) {
      return { message: error.message, errors: error.fieldErrors };
    }
    throw error;
  }
}

export async function deleteIncomeAction(formData: FormData) {
  const context = await getTenantContext();
  const id = String(formData.get("id") ?? "");

  await deleteIncome(id, {
    tenantUserId: context.tenantUserId,
    actorUserId: context.user.id
  });

  revalidatePath("/cashflow");
  redirect("/cashflow?tab=income");
}

export async function createExpenseAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getTenantContext();

  try {
    const expense = await createExpense(parseExpenseInput(formData), {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });

    revalidatePath("/cashflow");
    redirect(`/cashflow/expenses/${expense.id}`);
  } catch (error) {
    if (error instanceof FinanceError) {
      return { message: error.message, errors: error.fieldErrors };
    }
    throw error;
  }
}

export async function updateExpenseAction(id: string, _: FormState, formData: FormData): Promise<FormState> {
  const context = await getTenantContext();

  try {
    const expense = await updateExpense(id, parseExpenseInput(formData), {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });

    revalidatePath("/cashflow");
    redirect(`/cashflow/expenses/${expense.id}`);
  } catch (error) {
    if (error instanceof FinanceError) {
      return { message: error.message, errors: error.fieldErrors };
    }
    throw error;
  }
}

export async function deleteExpenseAction(formData: FormData) {
  const context = await getTenantContext();
  const id = String(formData.get("id") ?? "");

  await deleteExpense(id, {
    tenantUserId: context.tenantUserId,
    actorUserId: context.user.id
  });

  revalidatePath("/cashflow");
  redirect("/cashflow?tab=expense");
}
