import { DomainNav } from "@/components/domain/domain-nav";
import { TenancyForm } from "@/components/domain/tenancy-form";
import { PageHeader } from "@/components/ui/page-header";
import { getTenantContext } from "@/lib/auth/tenant";
import { getTenancyReferenceData } from "@/lib/domain/queries";

export default async function NewTenancyPage() {
  const { tenantUserId } = await getTenantContext();
  const { landlords, properties, tenants } = await getTenancyReferenceData(tenantUserId);

  return (
    <div className="space-y-8">
      <PageHeader title="New tenancy" description="Create a tenancy agreement, link tenants, and store the agreement document." />
      <DomainNav activeHref="/tenancy" />
      <TenancyForm
        landlords={landlords.map((landlord) => ({ id: landlord.id, name: landlord.name }))}
        properties={properties.map((property) => ({
          id: property.id,
          name: property.name,
          landlordName: property.landlord?.name
        }))}
        tenants={tenants.map((tenant) => ({
          id: tenant.id,
          firstName: tenant.firstName,
          surname: tenant.surname,
          phoneNumber: tenant.phoneNumber
        }))}
      />
    </div>
  );
}
