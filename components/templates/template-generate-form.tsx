"use client";

import { useActionState } from "react";

import { generateTemplateDocumentAction } from "@/app/(app)/templates/actions";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/domain/form-state";

export function TemplateGenerateForm({
  templateId,
  properties,
  tenancies
}: {
  templateId: string;
  properties: { id: string; name: string }[];
  tenancies: { id: string; label: string }[];
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    generateTemplateDocumentAction.bind(null, templateId),
    EMPTY_FORM_STATE
  );

  return (
    <form action={formAction} className="grid gap-4">
      <FormMessage state={state} />
      <FormField htmlFor="tenancyAgreementId" label="Tenancy agreement">
        <Select id="tenancyAgreementId" name="tenancyAgreementId">
          <option value="">No tenancy linked</option>
          {tenancies.map((tenancy) => (
            <option key={tenancy.id} value={tenancy.id}>{tenancy.label}</option>
          ))}
        </Select>
      </FormField>
      <FormField htmlFor="propertyId" label="Property">
        <Select id="propertyId" name="propertyId">
          <option value="">No property linked</option>
          {properties.map((property) => (
            <option key={property.id} value={property.id}>{property.name}</option>
          ))}
        </Select>
      </FormField>
      <SubmitButton pendingLabel="Generating PDF...">Generate PDF document</SubmitButton>
    </form>
  );
}
