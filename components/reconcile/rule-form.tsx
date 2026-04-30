"use client";

import { useActionState } from "react";

import { createRuleAction, updateRuleAction } from "@/app/(app)/reconcile/actions";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/domain/form-state";

export function RuleForm({
  bankAccountId,
  categories,
  tenancies,
  rule
}: {
  bankAccountId?: string;
  categories: { id: string; name: string }[];
  tenancies: { id: string; label: string }[];
  rule?: {
    id: string;
    name: string;
    type: "INCOME" | "EXPENSE";
    normalizedDescription: string;
    amount?: string | null;
    counterparty?: string | null;
    categoryId: string;
    tenancyAgreementId?: string | null;
    organisationExpense: boolean;
    supplier?: string | null;
    expenseDescription?: string | null;
    incomeNotes?: string | null;
    removeVat: boolean;
    paid: boolean;
    enabled: boolean;
    autoApply: boolean;
  };
}) {
  const actionFn = rule?.id
    ? updateRuleAction.bind(null, bankAccountId ?? null, rule.id)
    : createRuleAction.bind(null, bankAccountId ?? null);
  const [state, formAction] = useActionState<FormState, FormData>(
    actionFn,
    EMPTY_FORM_STATE
  );

  return (
    <Card>
      <form action={formAction} className="grid gap-4">
        <FormMessage state={state} />
        <div className="grid gap-4 md:grid-cols-2">
          <FormField htmlFor="name" label="Rule name">
            <Input defaultValue={rule?.name ?? ""} id="name" name="name" required />
          </FormField>
          <FormField htmlFor="type" label="Rule type">
            <Select defaultValue={rule?.type ?? "INCOME"} id="type" name="type" required>
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
            </Select>
          </FormField>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField htmlFor="normalizedDescription" label="Normalised description pattern">
            <Input defaultValue={rule?.normalizedDescription ?? ""} id="normalizedDescription" name="normalizedDescription" required />
          </FormField>
          <FormField htmlFor="amount" label="Amount match">
            <Input defaultValue={rule?.amount ?? ""} id="amount" name="amount" />
          </FormField>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField htmlFor="counterparty" label="Counterparty">
            <Input defaultValue={rule?.counterparty ?? ""} id="counterparty" name="counterparty" />
          </FormField>
          <FormField htmlFor="categoryId" label="Category">
            <Select defaultValue={rule?.categoryId ?? ""} id="categoryId" name="categoryId" required>
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </Select>
          </FormField>
        </div>
        <FormField htmlFor="tenancyAgreementId" label="Tenancy agreement">
          <Select defaultValue={rule?.tenancyAgreementId ?? ""} id="tenancyAgreementId" name="tenancyAgreementId">
            <option value="">No tenancy linked</option>
            {tenancies.map((tenancy) => (
              <option key={tenancy.id} value={tenancy.id}>{tenancy.label}</option>
            ))}
          </Select>
        </FormField>
        <div className="grid gap-4 md:grid-cols-4">
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <Checkbox defaultChecked={rule?.organisationExpense ?? false} name="organisationExpense" />
            Org expense
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <Checkbox defaultChecked={rule?.enabled ?? true} name="enabled" />
            Enabled
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <Checkbox defaultChecked={rule?.autoApply ?? true} name="autoApply" />
            Auto apply
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <Checkbox defaultChecked={rule?.removeVat ?? false} name="removeVat" />
            Remove VAT
          </label>
        </div>
        <FormField htmlFor="supplier" label="Supplier override">
          <Input defaultValue={rule?.supplier ?? ""} id="supplier" name="supplier" />
        </FormField>
        <FormField htmlFor="expenseDescription" label="Expense description override">
          <Input defaultValue={rule?.expenseDescription ?? ""} id="expenseDescription" name="expenseDescription" />
        </FormField>
        <FormField htmlFor="incomeNotes" label="Income notes override">
          <Input defaultValue={rule?.incomeNotes ?? ""} id="incomeNotes" name="incomeNotes" />
        </FormField>
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
          <Checkbox defaultChecked={rule?.paid ?? true} name="paid" />
          Mark expense rules as paid when auto-applied
        </label>
        <SubmitButton pendingLabel={rule ? "Saving rule..." : "Creating rule..."}>
          {rule ? "Save memorised rule" : "Create memorised rule"}
        </SubmitButton>
      </form>
    </Card>
  );
}
