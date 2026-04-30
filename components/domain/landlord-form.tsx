"use client";

import { useActionState } from "react";

import { EMPTY_FORM_STATE, type FormState } from "@/lib/domain/form-state";
import { createLandlordAction, updateLandlordAction } from "@/app/(app)/landlords/actions";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormMessage } from "@/components/forms/form-message";

type LandlordFormValues = {
  id?: string;
  name?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  notes?: string | null;
};

export function LandlordForm({
  landlord,
  action = "create"
}: {
  landlord?: LandlordFormValues;
  action?: "create" | "edit";
}) {
  const actionFn = action === "edit" && landlord?.id ? updateLandlordAction.bind(null, landlord.id) : createLandlordAction;

  const [state, formAction] = useActionState<FormState, FormData>(actionFn, EMPTY_FORM_STATE);

  return (
    <Card className="max-w-3xl">
      <form action={formAction} className="grid gap-5">
        <FormMessage state={state} />
        <FormField error={state.errors?.name?.[0]} htmlFor="name" label="Landlord name">
          <Input defaultValue={landlord?.name ?? ""} id="name" name="name" required />
        </FormField>
        <div className="grid gap-5 md:grid-cols-2">
          <FormField error={state.errors?.email?.[0]} htmlFor="email" label="Email">
            <Input defaultValue={landlord?.email ?? ""} id="email" name="email" type="email" />
          </FormField>
          <FormField error={state.errors?.phoneNumber?.[0]} htmlFor="phoneNumber" label="Phone number">
            <Input defaultValue={landlord?.phoneNumber ?? ""} id="phoneNumber" name="phoneNumber" />
          </FormField>
        </div>
        <FormField error={state.errors?.notes?.[0]} htmlFor="notes" label="Notes">
          <Textarea defaultValue={landlord?.notes ?? ""} id="notes" name="notes" />
        </FormField>
        <SubmitButton pendingLabel={action === "create" ? "Creating landlord..." : "Saving landlord..."}>
          {action === "create" ? "Create landlord" : "Save landlord"}
        </SubmitButton>
      </form>
    </Card>
  );
}
