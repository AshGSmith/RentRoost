"use client";

import { useActionState } from "react";

import { createReminderAction, updateReminderAction } from "@/app/(app)/reminders/actions";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/domain/form-state";

type ReminderFormValues = {
  id?: string;
  description?: string;
  propertyId?: string | null;
  tenancyAgreementId?: string | null;
  dueDate?: string;
  reminderAt?: string;
  critical?: boolean;
  recurring?: boolean;
  recurringFrequency?: "WEEKLY" | "MONTHLY" | "ANNUAL" | null;
};

function toDateInput(value?: string | Date | null) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}

function toDateTimeLocalInput(value?: string | Date | null) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function ReminderForm({
  reminder,
  properties,
  tenancies,
  action = "create"
}: {
  reminder?: ReminderFormValues;
  properties: { id: string; name: string }[];
  tenancies: { id: string; label: string }[];
  action?: "create" | "edit";
}) {
  const actionFn = action === "edit" && reminder?.id ? updateReminderAction.bind(null, reminder.id) : createReminderAction;
  const [state, formAction] = useActionState<FormState, FormData>(actionFn, EMPTY_FORM_STATE);

  return (
    <Card className="max-w-4xl">
      <form action={formAction} className="grid gap-5">
        <FormMessage state={state} />
        <FormField error={state.errors?.description?.[0]} htmlFor="description" label="Description">
          <Input defaultValue={reminder?.description ?? ""} id="description" name="description" required />
        </FormField>
        <div className="grid gap-5 md:grid-cols-2">
          <FormField error={state.errors?.propertyId?.[0]} htmlFor="propertyId" hint="Choose either a property or a tenancy." label="Property">
            <Select defaultValue={reminder?.propertyId ?? ""} id="propertyId" name="propertyId">
              <option value="">No property link</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField error={state.errors?.tenancyAgreementId?.[0]} htmlFor="tenancyAgreementId" hint="Choose either a tenancy or a property." label="Tenancy agreement">
            <Select defaultValue={reminder?.tenancyAgreementId ?? ""} id="tenancyAgreementId" name="tenancyAgreementId">
              <option value="">No tenancy link</option>
              {tenancies.map((tenancy) => (
                <option key={tenancy.id} value={tenancy.id}>
                  {tenancy.label}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <FormField error={state.errors?.dueDate?.[0]} htmlFor="dueDate" label="Due date">
            <Input defaultValue={toDateInput(reminder?.dueDate)} id="dueDate" name="dueDate" required type="date" />
          </FormField>
          <FormField error={state.errors?.reminderAt?.[0]} htmlFor="reminderAt" label="Reminder date and time">
            <Input defaultValue={toDateTimeLocalInput(reminder?.reminderAt)} id="reminderAt" name="reminderAt" required type="datetime-local" />
          </FormField>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <Checkbox defaultChecked={reminder?.critical ?? false} name="critical" />
            Critical compliance event
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <Checkbox defaultChecked={reminder?.recurring ?? false} name="recurring" />
            Recurring reminder
          </label>
        </div>
        <FormField error={state.errors?.recurringFrequency?.[0]} htmlFor="recurringFrequency" label="Recurring frequency">
          <Select defaultValue={reminder?.recurringFrequency ?? ""} id="recurringFrequency" name="recurringFrequency">
            <option value="">No recurrence</option>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="ANNUAL">Annual</option>
          </Select>
        </FormField>
        <SubmitButton pendingLabel={action === "create" ? "Creating reminder..." : "Saving reminder..."}>
          {action === "create" ? "Create reminder" : "Save reminder"}
        </SubmitButton>
      </form>
    </Card>
  );
}
