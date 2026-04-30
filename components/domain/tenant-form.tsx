"use client";

import { useActionState } from "react";

import { createTenantAction, updateTenantAction } from "@/app/(app)/tenants/actions";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/domain/form-state";

type TenantFormValues = {
  id?: string;
  firstName?: string | null;
  surname?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
};

export function TenantForm({
  tenant,
  action = "create"
}: {
  tenant?: TenantFormValues;
  action?: "create" | "edit";
}) {
  const actionFn = action === "edit" && tenant?.id ? updateTenantAction.bind(null, tenant.id) : createTenantAction;
  const [state, formAction] = useActionState<FormState, FormData>(actionFn, EMPTY_FORM_STATE);

  return (
    <Card className="max-w-3xl">
      <form action={formAction} className="grid gap-5">
        <FormMessage state={state} />
        <div className="grid gap-5 md:grid-cols-2">
          <FormField error={state.errors?.firstName?.[0]} htmlFor="firstName" label="First name">
            <Input defaultValue={tenant?.firstName ?? ""} id="firstName" name="firstName" required />
          </FormField>
          <FormField error={state.errors?.surname?.[0]} htmlFor="surname" label="Surname">
            <Input defaultValue={tenant?.surname ?? ""} id="surname" name="surname" required />
          </FormField>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <FormField error={state.errors?.phoneNumber?.[0]} htmlFor="phoneNumber" label="Phone number">
            <Input defaultValue={tenant?.phoneNumber ?? ""} id="phoneNumber" name="phoneNumber" required />
          </FormField>
          <FormField error={state.errors?.email?.[0]} htmlFor="email" label="Email">
            <Input defaultValue={tenant?.email ?? ""} id="email" name="email" type="email" />
          </FormField>
        </div>
        <SubmitButton pendingLabel={action === "create" ? "Creating tenant..." : "Saving tenant..."}>
          {action === "create" ? "Create tenant" : "Save tenant"}
        </SubmitButton>
      </form>
    </Card>
  );
}
