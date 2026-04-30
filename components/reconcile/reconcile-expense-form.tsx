"use client";

import { useActionState } from "react";

import { reconcileTransactionAsExpenseAction } from "@/app/(app)/reconcile/actions";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/domain/form-state";

export function ReconcileExpenseForm({
  transactionId,
  amount,
  dueDate,
  defaultSupplier,
  defaultDescription,
  categories,
  tenancies,
  redirectTo
}: {
  transactionId: string;
  amount: string;
  dueDate: string;
  defaultSupplier: string;
  defaultDescription: string;
  categories: { id: string; name: string }[];
  tenancies: { id: string; label: string }[];
  redirectTo?: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    reconcileTransactionAsExpenseAction.bind(null, transactionId),
    EMPTY_FORM_STATE
  );

  return (
    <Card>
      <form action={formAction} className="grid gap-4">
        {redirectTo ? <input name="redirectTo" type="hidden" value={redirectTo} /> : null}
        <FormMessage state={state} />
        <div className="grid gap-4 md:grid-cols-2">
          <FormField htmlFor="categoryId" label="Expense category">
            <Select id="categoryId" name="categoryId" required>
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField htmlFor="tenancyAgreementId" label="Tenancy agreement">
            <Select id="tenancyAgreementId" name="tenancyAgreementId">
              <option value="">No tenancy linked</option>
              {tenancies.map((tenancy) => (
                <option key={tenancy.id} value={tenancy.id}>{tenancy.label}</option>
              ))}
            </Select>
          </FormField>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField htmlFor="grossAmount" label="Amount inclusive of VAT">
            <Input defaultValue={amount} id="grossAmount" name="grossAmount" required />
          </FormField>
          <FormField htmlFor="dueDate" label="Due date">
            <Input defaultValue={dueDate} id="dueDate" name="dueDate" required type="date" />
          </FormField>
        </div>
        <FormField htmlFor="description" label="Description">
          <Input defaultValue={defaultDescription} id="description" name="description" required />
        </FormField>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField htmlFor="supplier" label="Supplier">
            <Input defaultValue={defaultSupplier} id="supplier" name="supplier" required />
          </FormField>
          <FormField htmlFor="invoiceNumber" label="Invoice number">
            <Input id="invoiceNumber" name="invoiceNumber" />
          </FormField>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <Checkbox name="removeVat" />
            Remove VAT
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <Checkbox defaultChecked name="paid" />
            Paid
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <Checkbox name="organisationExpense" />
            Organisation expense
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <Checkbox name="saveRule" />
            Save rule
          </label>
        </div>
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
          <Checkbox name="ruleAutoApply" />
          Auto-apply future high-confidence matches
        </label>
        <SubmitButton pendingLabel="Reconciling expense...">Reconcile as expense</SubmitButton>
      </form>
    </Card>
  );
}
