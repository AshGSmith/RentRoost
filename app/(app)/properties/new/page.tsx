import { DomainNav } from "@/components/domain/domain-nav";
import { PropertyForm } from "@/components/domain/property-form";
import { PageHeader } from "@/components/ui/page-header";
import { getTenantContext } from "@/lib/auth/tenant";
import { listLandlordsForUser } from "@/lib/domain/queries";

export default async function NewPropertyPage() {
  const { tenantUserId } = await getTenantContext();
  const landlords = await listLandlordsForUser(tenantUserId);

  return (
    <div className="space-y-8">
      <PageHeader title="New property" description="Add a property and optionally connect it to a landlord." />
      <DomainNav activeHref="/properties" />
      <PropertyForm landlords={landlords.map((landlord) => ({ id: landlord.id, name: landlord.name }))} />
    </div>
  );
}
