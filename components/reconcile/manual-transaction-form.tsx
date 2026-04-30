"use client";

import { useActionState } from "react";

import { createManualTransactionAction } from "@/app/(app)/reconcile/actions";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/domain/form-state";

export function ManualTransactionForm({
  bankAccountId,
  currency
}: {
  bankAccountId: string;
  currency: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    createManualTransactionAction.bind(null, bankAccountId),
    EMPTY_FORM_STATE
  );
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Card>
      <form action={formAction} className="grid gap-5">
        <FormMessage state={state} />
        <div className="grid gap-5 md:grid-cols-2">
          <FormField htmlFor="bookedAt" label="Booked date">
            <Input defaultValue={today} id="bookedAt" name="bookedAt" required type="date" />
          </FormField>
          <FormField htmlFor="valueDate" label="Value date">
            <Input defaultValue={today} id="valueDate" name="valueDate" type="date" />
          </FormField>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <FormField hint="Use positive for income, negative for spend." htmlFor="amount" label="Signed amount">
            <Input id="amount" name="amount" placeholder="1250.00 or -72.40" required />
          </FormField>
          <FormField htmlFor="currency" label="Currency">
            <Input defaultValue={currency} id="currency" name="currency" required />
          </FormField>
        </div>
        <FormField htmlFor="description" label="Description">
          <Input id="description" name="description" required />
        </FormField>
        <div className="grid gap-5 md:grid-cols-2">
          <FormField htmlFor="counterparty" label="Counterparty / payee">
            <Input id="counterparty" name="counterparty" />
          </FormField>
          <FormField htmlFor="reference" label="Reference">
            <Input id="reference" name="reference" />
          </FormField>
        </div>
        <FormField htmlFor="externalTransactionId" label="External transaction ID">
          <Input id="externalTransactionId" name="externalTransactionId" />
        </FormField>
        <SubmitButton pendingLabel="Importing transaction...">Import stub transaction</SubmitButton>
      </form>
    </Card>
  );
}
