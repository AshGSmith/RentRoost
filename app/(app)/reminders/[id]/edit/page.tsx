import { notFound } from "next/navigation";

import { ReminderForm } from "@/components/domain/reminder-form";
import { PageHeader } from "@/components/ui/page-header";
import { getTenantContext } from "@/lib/auth/tenant";
import { getReminderForUser, listReminderReferences } from "@/lib/domain/queries";

export default async function EditReminderPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { tenantUserId }] = await Promise.all([params, getTenantContext()]);
  const [reminder, refs] = await Promise.all([
    getReminderForUser(tenantUserId, id),
    listReminderReferences(tenantUserId)
  ]);

  if (!reminder) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Edit reminder" description="Update reminder details, due timing and recurrence." />
      <ReminderForm
        action="edit"
        reminder={{
          id: reminder.id,
          description: reminder.description,
          propertyId: reminder.propertyId,
          tenancyAgreementId: reminder.tenancyAgreementId,
          dueDate: reminder.dueDate.toISOString(),
          reminderAt: reminder.reminderAt.toISOString(),
          critical: reminder.critical,
          recurring: reminder.recurring,
          recurringFrequency: reminder.recurringFrequency
        }}
        properties={refs.properties.map((property) => ({ id: property.id, name: property.name }))}
        tenancies={refs.tenancies.map((tenancy) => ({
          id: tenancy.id,
          label: `${tenancy.property.name} · ${tenancy.startDate.toISOString().slice(0, 10)}`
        }))}
      />
    </div>
  );
}
