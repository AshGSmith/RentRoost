"use client";

import { useActionState } from "react";

import { createTenancyAction, updateTenancyAction } from "@/app/(app)/tenancy/actions";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/domain/form-state";

type ReferenceOption = { id: string; name: string; landlordName?: string | null };
type TenantOption = { id: string; firstName: string; surname: string; phoneNumber: string };

type TenancyValues = {
  id?: string;
  propertyId?: string;
  landlordId?: string | null;
  startDate?: string;
  endDate?: string | null;
  paymentDay?: number;
  depositAmount?: string;
  rentReviewDate?: string;
  selectedTenantIds?: string[];
  initialRentAmount?: string;
  initialRentEffectiveDate?: string;
};

function formatDateForInput(value?: string | Date | null) {
  if (!value) {
    return "";
  }

  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}

export function TenancyForm({
  landlords,
  properties,
  tenants,
  tenancy,
  action = "create"
}: {
  landlords: ReferenceOption[];
  properties: ReferenceOption[];
  tenants: TenantOption[];
  tenancy?: TenancyValues;
  action?: "create" | "edit";
}) {
  const actionFn = action === "edit" && tenancy?.id ? updateTenancyAction.bind(null, tenancy.id) : createTenancyAction;
  const [state, formAction] = useActionState<FormState, FormData>(actionFn, EMPTY_FORM_STATE);

  return (
    <Card className="max-w-5xl">
      <form action={formAction} className="grid gap-6" encType="multipart/form-data">
        <FormMessage state={state} />
        <div className="grid gap-5 md:grid-cols-2">
          <FormField error={state.errors?.propertyId?.[0]} htmlFor="propertyId" label="Property">
            <Select defaultValue={tenancy?.propertyId ?? ""} id="propertyId" name="propertyId" required>
              <option value="">Select property</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                  {property.landlordName ? ` • ${property.landlordName}` : ""}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField error={state.errors?.landlordId?.[0]} htmlFor="landlordId" label="Landlord">
            <Select defaultValue={tenancy?.landlordId ?? ""} id="landlordId" name="landlordId">
              <option value="">Use property landlord or none</option>
              {landlords.map((landlord) => (
                <option key={landlord.id} value={landlord.id}>
                  {landlord.name}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <FormField error={state.errors?.startDate?.[0]} htmlFor="startDate" label="Start date">
            <Input defaultValue={formatDateForInput(tenancy?.startDate)} id="startDate" name="startDate" required type="date" />
          </FormField>
          <FormField error={state.errors?.endDate?.[0]} htmlFor="endDate" label="End date">
            <Input defaultValue={formatDateForInput(tenancy?.endDate)} id="endDate" name="endDate" type="date" />
          </FormField>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <FormField error={state.errors?.paymentDay?.[0]} htmlFor="paymentDay" label="Payment date">
            <Input
              defaultValue={String(tenancy?.paymentDay ?? 1)}
              id="paymentDay"
              max={31}
              min={1}
              name="paymentDay"
              required
              type="number"
            />
          </FormField>
          <FormField error={state.errors?.depositAmount?.[0]} htmlFor="depositAmount" label="Deposit amount">
            <Input defaultValue={tenancy?.depositAmount ?? ""} id="depositAmount" name="depositAmount" required />
          </FormField>
          <FormField error={state.errors?.rentReviewDate?.[0]} htmlFor="rentReviewDate" hint="Defaults to one year after the start date if left blank." label="Rent review date">
            <Input defaultValue={formatDateForInput(tenancy?.rentReviewDate)} id="rentReviewDate" name="rentReviewDate" type="date" />
          </FormField>
        </div>

        {action === "create" ? (
          <div className="grid gap-5 md:grid-cols-2">
            <FormField error={state.errors?.initialRentAmount?.[0]} htmlFor="initialRentAmount" label="Initial rent amount">
              <Input defaultValue={tenancy?.initialRentAmount ?? ""} id="initialRentAmount" name="initialRentAmount" required />
            </FormField>
            <FormField error={state.errors?.initialRentEffectiveDate?.[0]} htmlFor="initialRentEffectiveDate" hint="Defaults to the tenancy start date." label="Rent effective date">
              <Input defaultValue={formatDateForInput(tenancy?.initialRentEffectiveDate)} id="initialRentEffectiveDate" name="initialRentEffectiveDate" type="date" />
            </FormField>
          </div>
        ) : (
          <>
            <input name="initialRentAmount" type="hidden" value={tenancy?.initialRentAmount ?? ""} />
            <input
              name="initialRentEffectiveDate"
              type="hidden"
              value={formatDateForInput(tenancy?.initialRentEffectiveDate)}
            />
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              Rent history is managed separately below the tenancy detail page to preserve the audit trail.
            </div>
          </>
        )}

        <FormField error={state.errors?.selectedTenantIds?.[0]} label="Linked tenants">
          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
            {tenants.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No tenants created yet. Use the inline section below to add one now.</p>
            ) : (
              tenants.map((tenant) => (
                <label className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-200" key={tenant.id}>
                  <Checkbox
                    defaultChecked={tenancy?.selectedTenantIds?.includes(tenant.id)}
                    name="selectedTenantIds"
                    value={tenant.id}
                  />
                  <span>
                    {tenant.firstName} {tenant.surname}
                    <span className="block text-xs text-slate-500 dark:text-slate-400">{tenant.phoneNumber}</span>
                  </span>
                </label>
              ))
            )}
          </div>
        </FormField>

        <div className="grid gap-5 rounded-2xl border border-dashed border-brand-200 bg-brand-50/60 p-5 dark:border-brand-900 dark:bg-brand-950/20">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-950 dark:text-white">Create tenant inline</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Fill this in only if you need to create a new tenant while setting up the tenancy.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <FormField error={state.errors?.["inlineTenant.firstName"]?.[0] ?? state.errors?.firstName?.[0]} htmlFor="inlineTenantFirstName" label="First name">
              <Input id="inlineTenantFirstName" name="inlineTenantFirstName" />
            </FormField>
            <FormField error={state.errors?.["inlineTenant.surname"]?.[0] ?? state.errors?.surname?.[0]} htmlFor="inlineTenantSurname" label="Surname">
              <Input id="inlineTenantSurname" name="inlineTenantSurname" />
            </FormField>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <FormField error={state.errors?.["inlineTenant.phoneNumber"]?.[0] ?? state.errors?.phoneNumber?.[0]} htmlFor="inlineTenantPhoneNumber" label="Phone number">
              <Input id="inlineTenantPhoneNumber" name="inlineTenantPhoneNumber" />
            </FormField>
            <FormField error={state.errors?.["inlineTenant.email"]?.[0] ?? state.errors?.email?.[0]} htmlFor="inlineTenantEmail" label="Email">
              <Input id="inlineTenantEmail" name="inlineTenantEmail" type="email" />
            </FormField>
          </div>
        </div>

        <FormField error={state.errors?.agreementDocument?.[0]} hint="PDF, DOC or DOCX up to 5MB." htmlFor="agreementDocument" label="Tenancy agreement document">
          <Input accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" id="agreementDocument" name="agreementDocument" type="file" />
        </FormField>

        <SubmitButton pendingLabel={action === "create" ? "Creating tenancy..." : "Saving tenancy..."}>
          {action === "create" ? "Create tenancy" : "Save tenancy"}
        </SubmitButton>
      </form>
    </Card>
  );
}
