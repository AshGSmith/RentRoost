import { ReminderForm } from "@/components/domain/reminder-form";
import { PageHeader } from "@/components/ui/page-header";
import { getTenantContext } from "@/lib/auth/tenant";
import { listReminderReferences } from "@/lib/domain/queries";

export default async function NewReminderPage() {
  const { tenantUserId } = await getTenantContext();
  const refs = await listReminderReferences(tenantUserId);

  return (
    <div className="space-y-8">
      <PageHeader title="New reminder" description="Create an operational reminder or compliance event." />
      <ReminderForm
        properties={refs.properties.map((property) => ({ id: property.id, name: property.name }))}
        tenancies={refs.tenancies.map((tenancy) => ({
          id: tenancy.id,
          label: `${tenancy.property.name} · ${tenancy.startDate.toISOString().slice(0, 10)}`
        }))}
      />
    </div>
  );
}
