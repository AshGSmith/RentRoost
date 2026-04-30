"use client";

import { useActionState } from "react";

import { reconcileTransactionAsIncomeAction } from "@/app/(app)/reconcile/actions";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/domain/form-state";

export function ReconcileIncomeForm({
  transactionId,
  amount,
  paymentDate,
  categories,
  tenancies,
  redirectTo
}: {
  transactionId: string;
  amount: string;
  paymentDate: string;
  categories: { id: string; name: string }[];
  tenancies: { id: string; label: string }[];
  redirectTo?: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    reconcileTransactionAsIncomeAction.bind(null, transactionId),
    EMPTY_FORM_STATE
  );

  return (
    <Card>
      <form action={formAction} className="grid gap-4">
        {redirectTo ? <input name="redirectTo" type="hidden" value={redirectTo} /> : null}
        <FormMessage state={state} />
        <FormField htmlFor="categoryId" label="Income category">
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
        <div className="grid gap-4 md:grid-cols-2">
          <FormField htmlFor="amount" label="Amount">
            <Input defaultValue={amount} id="amount" name="amount" required />
          </FormField>
          <FormField htmlFor="paymentDate" label="Payment date">
            <Input defaultValue={paymentDate} id="paymentDate" name="paymentDate" required type="date" />
          </FormField>
        </div>
        <FormField htmlFor="notes" label="Notes">
          <Textarea id="notes" name="notes" />
        </FormField>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <Checkbox name="saveRule" />
            Save memorised match
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <Checkbox name="ruleAutoApply" />
            Auto-apply future high-confidence matches
          </label>
        </div>
        <SubmitButton pendingLabel="Reconciling income...">Reconcile as income</SubmitButton>
      </form>
    </Card>
  );
}
