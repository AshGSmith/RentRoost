import { notFound } from "next/navigation";

import { DomainNav } from "@/components/domain/domain-nav";
import { PropertyForm } from "@/components/domain/property-form";
import { PageHeader } from "@/components/ui/page-header";
import { getTenantContext } from "@/lib/auth/tenant";
import { getPropertyForUser, listLandlordsForUser } from "@/lib/domain/queries";

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { tenantUserId }] = await Promise.all([params, getTenantContext()]);
  const [property, landlords] = await Promise.all([
    getPropertyForUser(tenantUserId, id),
    listLandlordsForUser(tenantUserId)
  ]);

  if (!property) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Edit property" description="Update address, landlord and property notes." />
      <DomainNav activeHref="/properties" />
      <PropertyForm
        action="edit"
        landlords={landlords.map((landlord) => ({ id: landlord.id, name: landlord.name }))}
        property={{
          id: property.id,
          landlordId: property.landlordId,
          name: property.name,
          addressLine1: property.addressLine1,
          addressLine2: property.addressLine2,
          city: property.city,
          postcode: property.postcode,
          notes: property.notes
        }}
      />
    </div>
  );
}
