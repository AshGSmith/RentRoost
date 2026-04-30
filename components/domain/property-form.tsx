"use client";

import { useActionState } from "react";

import { createPropertyAction, updatePropertyAction } from "@/app/(app)/properties/actions";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/domain/form-state";

type LandlordOption = { id: string; name: string };

type PropertyFormValues = {
  id?: string;
  landlordId?: string | null;
  name?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  postcode?: string | null;
  notes?: string | null;
};

export function PropertyForm({
  landlords,
  property,
  action = "create"
}: {
  landlords: LandlordOption[];
  property?: PropertyFormValues;
  action?: "create" | "edit";
}) {
  const actionFn =
    action === "edit" && property?.id ? updatePropertyAction.bind(null, property.id) : createPropertyAction;

  const [state, formAction] = useActionState<FormState, FormData>(actionFn, EMPTY_FORM_STATE);

  return (
    <Card className="max-w-4xl">
      <form action={formAction} className="grid gap-5">
        <FormMessage state={state} />
        <FormField error={state.errors?.landlordId?.[0]} htmlFor="landlordId" label="Landlord">
          <Select defaultValue={property?.landlordId ?? ""} id="landlordId" name="landlordId">
            <option value="">No landlord linked</option>
            {landlords.map((landlord) => (
              <option key={landlord.id} value={landlord.id}>
                {landlord.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField error={state.errors?.name?.[0]} htmlFor="name" label="Property name">
          <Input defaultValue={property?.name ?? ""} id="name" name="name" required />
        </FormField>
        <FormField error={state.errors?.addressLine1?.[0]} htmlFor="addressLine1" label="Address line 1">
          <Input defaultValue={property?.addressLine1 ?? ""} id="addressLine1" name="addressLine1" required />
        </FormField>
        <FormField error={state.errors?.addressLine2?.[0]} htmlFor="addressLine2" label="Address line 2">
          <Input defaultValue={property?.addressLine2 ?? ""} id="addressLine2" name="addressLine2" />
        </FormField>
        <div className="grid gap-5 md:grid-cols-2">
          <FormField error={state.errors?.city?.[0]} htmlFor="city" label="Town or city">
            <Input defaultValue={property?.city ?? ""} id="city" name="city" required />
          </FormField>
          <FormField error={state.errors?.postcode?.[0]} htmlFor="postcode" label="Postcode">
            <Input defaultValue={property?.postcode ?? ""} id="postcode" name="postcode" required />
          </FormField>
        </div>
        <FormField error={state.errors?.notes?.[0]} htmlFor="notes" label="Notes">
          <Textarea defaultValue={property?.notes ?? ""} id="notes" name="notes" />
        </FormField>
        <SubmitButton pendingLabel={action === "create" ? "Creating property..." : "Saving property..."}>
          {action === "create" ? "Create property" : "Save property"}
        </SubmitButton>
      </form>
    </Card>
  );
}
