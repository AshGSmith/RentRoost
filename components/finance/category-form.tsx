"use client";

import { useActionState } from "react";

import { createCategoryAction } from "@/app/(app)/cashflow/actions";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/domain/form-state";

export function CategoryForm({ type }: { type: "INCOME" | "EXPENSE" }) {
  const [state, formAction] = useActionState<FormState, FormData>(createCategoryAction, EMPTY_FORM_STATE);

  return (
    <Card className="max-w-xl">
      <form action={formAction} className="grid gap-4">
        <input name="type" type="hidden" value={type} />
        <FormMessage state={state} />
        <FormField error={state.errors?.name?.[0]} htmlFor="name" label="Category name">
          <Input id="name" name="name" required />
        </FormField>
        <FormField htmlFor="typeDisplay" label="Category type">
          <Select defaultValue={type} disabled id="typeDisplay" name="typeDisplay">
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
          </Select>
        </FormField>
        <SubmitButton pendingLabel="Creating category...">Create category</SubmitButton>
      </form>
    </Card>
  );
}
