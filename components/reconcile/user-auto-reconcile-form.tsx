"use client";

import { useActionState } from "react";

import { updateUserAutoReconcileAction } from "@/app/(app)/reconcile/actions";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/domain/form-state";

export function UserAutoReconcileForm({
  enabled,
  minConfidence
}: {
  enabled: boolean;
  minConfidence: number;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    updateUserAutoReconcileAction,
    EMPTY_FORM_STATE
  );

  return (
    <Card className="max-w-3xl">
      <form action={formAction} className="grid gap-5">
        <FormMessage state={state} />
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
          <Checkbox defaultChecked={enabled} name="autoReconciliationEnabled" />
          Enable auto reconciliation by default for new and unoverridden bank accounts
        </label>
        <FormField
          error={state.errors?.autoReconciliationMinConfidence?.[0]}
          htmlFor="autoReconciliationMinConfidence"
          label="Minimum confidence to auto-apply"
        >
          <Input
            defaultValue={String(minConfidence)}
            id="autoReconciliationMinConfidence"
            max={100}
            min={0}
            name="autoReconciliationMinConfidence"
            type="number"
          />
        </FormField>
        <SubmitButton pendingLabel="Saving defaults...">Save defaults</SubmitButton>
      </form>
    </Card>
  );
}
