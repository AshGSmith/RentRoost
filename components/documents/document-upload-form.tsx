"use client";

import { useActionState } from "react";

import { uploadDocumentAction } from "@/app/(app)/documents/actions";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/domain/form-state";

export function DocumentUploadForm({
  properties,
  tenancies
}: {
  properties: { id: string; name: string }[];
  tenancies: { id: string; label: string }[];
}) {
  const [state, formAction] = useActionState<FormState, FormData>(uploadDocumentAction, EMPTY_FORM_STATE);

  return (
    <form action={formAction} className="grid gap-4">
      <FormMessage state={state} />
      <FormField error={state.errors?.name?.[0]} htmlFor="name" label="Name">
        <Input id="name" name="name" required />
      </FormField>
      <FormField error={state.errors?.file?.[0]} htmlFor="file" label="File upload">
        <Input id="file" name="file" required type="file" />
      </FormField>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField htmlFor="propertyId" label="Property link">
          <Select id="propertyId" name="propertyId">
            <option value="">No property linked</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>{property.name}</option>
            ))}
          </Select>
        </FormField>
        <FormField htmlFor="tenancyAgreementId" label="Tenancy link">
          <Select id="tenancyAgreementId" name="tenancyAgreementId">
            <option value="">No tenancy linked</option>
            {tenancies.map((tenancy) => (
              <option key={tenancy.id} value={tenancy.id}>{tenancy.label}</option>
            ))}
          </Select>
        </FormField>
      </div>
      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
        <Checkbox name="organisationDocument" />
        Organisation-level document
      </label>
      <SubmitButton pendingLabel="Uploading document...">Upload document</SubmitButton>
    </form>
  );
}
