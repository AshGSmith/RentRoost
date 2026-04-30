"use client";

import { useActionState } from "react";

import { createBankAccountAction, updateBankAccountAction } from "@/app/(app)/reconcile/actions";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/domain/form-state";

export function BankAccountForm({
  account
}: {
  account?: {
    id: string;
    name: string;
    institutionName?: string | null;
    accountMask?: string | null;
    currency: string;
    provider: string;
    connectionStatus?: string;
    autoReconciliationEnabled?: boolean | null;
    autoReconciliationMinConfidence?: number | null;
  };
}) {
  const actionFn = account?.id ? updateBankAccountAction.bind(null, account.id) : createBankAccountAction;
  const [state, formAction] = useActionState<FormState, FormData>(actionFn, EMPTY_FORM_STATE);

  return (
    <Card className="max-w-4xl">
      <form action={formAction} className="grid gap-5">
        <FormMessage state={state} />
        <div className="grid gap-5 md:grid-cols-2">
          <FormField error={state.errors?.name?.[0]} htmlFor="name" label="Account name">
            <Input defaultValue={account?.name ?? ""} id="name" name="name" required />
          </FormField>
          <FormField error={state.errors?.institutionName?.[0]} htmlFor="institutionName" label="Institution">
            <Input defaultValue={account?.institutionName ?? ""} id="institutionName" name="institutionName" />
          </FormField>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <FormField htmlFor="accountMask" label="Account mask">
            <Input defaultValue={account?.accountMask ?? ""} id="accountMask" name="accountMask" placeholder="1234" />
          </FormField>
          <FormField htmlFor="currency" label="Currency">
            <Input defaultValue={account?.currency ?? "GBP"} id="currency" name="currency" required />
          </FormField>
          <FormField htmlFor="provider" label="Provider">
            <Select defaultValue={account?.provider ?? "manual"} id="provider" name="provider">
              <option value="manual">Manual import stub</option>
              <option value="truelayer">TrueLayer live feed</option>
            </Select>
          </FormField>
        </div>
        {account?.provider === "truelayer" ? (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100">
            Live provider accounts are linked securely after save. You’ll be able to connect and sync from the account detail page.
          </div>
        ) : null}
        <div className="grid gap-5 md:grid-cols-2">
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <Checkbox
              defaultChecked={account?.autoReconciliationEnabled ?? false}
              name="autoReconciliationEnabled"
            />
            Enable auto reconciliation for this account
          </label>
          <FormField htmlFor="autoReconciliationMinConfidence" label="Auto reconcile confidence threshold">
            <Input
              defaultValue={String(account?.autoReconciliationMinConfidence ?? 85)}
              id="autoReconciliationMinConfidence"
              max={100}
              min={0}
              name="autoReconciliationMinConfidence"
              type="number"
            />
          </FormField>
        </div>
        <SubmitButton pendingLabel={account ? "Saving bank account..." : "Creating bank account..."}>
          {account ? "Save bank account" : "Create bank account"}
        </SubmitButton>
      </form>
    </Card>
  );
}
