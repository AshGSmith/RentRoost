"use client";

import { useActionState } from "react";

import { createIncomeAction, updateIncomeAction } from "@/app/(app)/cashflow/actions";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/domain/form-state";

export function IncomeForm({
  income,
  categories,
  tenancies
}: {
  income?: {
    id: string;
    categoryId: string;
    tenancyAgreementId?: string | null;
    amount: string;
    paymentDate: string;
    notes?: string | null;
  };
  categories: { id: string; name: string }[];
  tenancies: { id: string; label: string }[];
}) {
  const actionFn = income?.id ? updateIncomeAction.bind(null, income.id) : createIncomeAction;
  const [state, formAction] = useActionState<FormState, FormData>(actionFn, EMPTY_FORM_STATE);

  return (
    <Card className="max-w-4xl">
      <form action={formAction} className="grid gap-5">
        <FormMessage state={state} />
        <div className="grid gap-5 md:grid-cols-2">
          <FormField error={state.errors?.categoryId?.[0]} htmlFor="categoryId" label="Category">
            <Select defaultValue={income?.categoryId ?? ""} id="categoryId" name="categoryId" required>
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField error={state.errors?.tenancyAgreementId?.[0]} htmlFor="tenancyAgreementId" label="Tenancy agreement">
            <Select defaultValue={income?.tenancyAgreementId ?? ""} id="tenancyAgreementId" name="tenancyAgreementId">
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
          <FormField error={state.errors?.amount?.[0]} htmlFor="amount" label="Amount">
            <Input defaultValue={income?.amount ?? ""} id="amount" name="amount" required />
          </FormField>
          <FormField error={state.errors?.paymentDate?.[0]} htmlFor="paymentDate" label="Payment date">
            <Input defaultValue={income?.paymentDate ?? ""} id="paymentDate" name="paymentDate" required type="date" />
          </FormField>
        </div>
        <FormField error={state.errors?.notes?.[0]} htmlFor="notes" label="Notes">
          <Textarea defaultValue={income?.notes ?? ""} id="notes" name="notes" />
        </FormField>
        <SubmitButton pendingLabel={income ? "Saving income..." : "Creating income..."}>
          {income ? "Save income" : "Create income"}
        </SubmitButton>
      </form>
    </Card>
  );
}
