"use client";

import { useActionState } from "react";

import { createExpenseAction, updateExpenseAction } from "@/app/(app)/cashflow/actions";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/domain/form-state";

export function ExpenseForm({
  expense,
  categories,
  tenancies,
  today
}: {
  expense?: {
    id: string;
    categoryId: string;
    tenancyAgreementId?: string | null;
    grossAmount: string;
    removeVat: boolean;
    description: string;
    invoiceNumber?: string | null;
    dueDate: string;
    supplier: string;
    paid: boolean;
    organisationExpense: boolean;
  };
  categories: { id: string; name: string }[];
  tenancies: { id: string; label: string }[];
  today: string;
}) {
  const actionFn = expense?.id ? updateExpenseAction.bind(null, expense.id) : createExpenseAction;
  const [state, formAction] = useActionState<FormState, FormData>(actionFn, EMPTY_FORM_STATE);

  return (
    <Card className="max-w-5xl">
      <form action={formAction} className="grid gap-5">
        <FormMessage state={state} />
        <div className="grid gap-5 md:grid-cols-2">
          <FormField error={state.errors?.categoryId?.[0]} htmlFor="categoryId" label="Category">
            <Select defaultValue={expense?.categoryId ?? ""} id="categoryId" name="categoryId" required>
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField error={state.errors?.tenancyAgreementId?.[0]} htmlFor="tenancyAgreementId" label="Tenancy agreement">
            <Select defaultValue={expense?.tenancyAgreementId ?? ""} id="tenancyAgreementId" name="tenancyAgreementId">
              <option value="">No tenancy linked</option>
              {tenancies.map((tenancy) => (
                <option key={tenancy.id} value={tenancy.id}>
                  {tenancy.label}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <FormField error={state.errors?.grossAmount?.[0]} htmlFor="grossAmount" label="Amount inclusive of VAT">
            <Input defaultValue={expense?.grossAmount ?? ""} id="grossAmount" name="grossAmount" required />
          </FormField>
          <FormField error={state.errors?.supplier?.[0]} htmlFor="supplier" label="Supplier">
            <Input defaultValue={expense?.supplier ?? ""} id="supplier" name="supplier" required />
          </FormField>
        </div>
        <FormField error={state.errors?.description?.[0]} htmlFor="description" label="Description">
          <Input defaultValue={expense?.description ?? ""} id="description" name="description" required />
        </FormField>
        <div className="grid gap-5 md:grid-cols-2">
          <FormField error={state.errors?.invoiceNumber?.[0]} htmlFor="invoiceNumber" label="Invoice number">
            <Input defaultValue={expense?.invoiceNumber ?? ""} id="invoiceNumber" name="invoiceNumber" />
          </FormField>
          <FormField error={state.errors?.dueDate?.[0]} htmlFor="dueDate" label="Due date">
            <Input defaultValue={expense?.dueDate ?? today} id="dueDate" name="dueDate" required type="date" />
          </FormField>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <Checkbox defaultChecked={expense?.removeVat ?? false} name="removeVat" />
            Remove VAT
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <Checkbox defaultChecked={expense?.paid ?? false} name="paid" />
            Paid
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <Checkbox defaultChecked={expense?.organisationExpense ?? false} name="organisationExpense" />
            Organisation expense
          </label>
        </div>
        <SubmitButton pendingLabel={expense ? "Saving expense..." : "Creating expense..."}>
          {expense ? "Save expense" : "Create expense"}
        </SubmitButton>
      </form>
    </Card>
  );
}
