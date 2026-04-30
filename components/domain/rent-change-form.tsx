"use client";

import { useActionState } from "react";

import { createRentChangeAction, updateRentChangeAction } from "@/app/(app)/tenancy/actions";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/domain/form-state";

export function RentChangeForm({
  tenancyAgreementId,
  rentChange
}: {
  tenancyAgreementId: string;
  rentChange?: { id: string; amount: string; effectiveDate: string };
}) {
  const actionFn = rentChange?.id
    ? updateRentChangeAction.bind(null, rentChange.id)
    : createRentChangeAction;
  const [state, formAction] = useActionState<FormState, FormData>(actionFn, EMPTY_FORM_STATE);

  return (
    <Card className="max-w-2xl">
      <form action={formAction} className="grid gap-5">
        <input name="tenancyAgreementId" type="hidden" value={tenancyAgreementId} />
        <FormMessage state={state} />
        <FormField error={state.errors?.amount?.[0]} htmlFor="amount" label="Rent amount">
          <Input defaultValue={rentChange?.amount ?? ""} id="amount" name="amount" required />
        </FormField>
        <FormField error={state.errors?.effectiveDate?.[0]} htmlFor="effectiveDate" label="Effective date">
          <Input defaultValue={rentChange?.effectiveDate ?? ""} id="effectiveDate" name="effectiveDate" required type="date" />
        </FormField>
        <SubmitButton pendingLabel={rentChange ? "Saving change..." : "Adding change..."}>
          {rentChange ? "Save rent change" : "Add rent change"}
        </SubmitButton>
      </form>
    </Card>
  );
}
