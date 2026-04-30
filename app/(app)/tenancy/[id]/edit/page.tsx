import { notFound } from "next/navigation";

import { DomainNav } from "@/components/domain/domain-nav";
import { TenancyForm } from "@/components/domain/tenancy-form";
import { PageHeader } from "@/components/ui/page-header";
import { getTenantContext } from "@/lib/auth/tenant";
import { getCurrentRent, getTenancyForUser, getTenancyReferenceData } from "@/lib/domain/queries";

export default async function EditTenancyPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { tenantUserId }] = await Promise.all([params, getTenantContext()]);
  const [tenancy, refs] = await Promise.all([
    getTenancyForUser(tenantUserId, id),
    getTenancyReferenceData(tenantUserId)
  ]);

  if (!tenancy) {
    notFound();
  }

  const currentRent = getCurrentRent(tenancy);

  return (
    <div className="space-y-8">
      <PageHeader title="Edit tenancy" description="Update the tenancy agreement and linked tenants." />
      <DomainNav activeHref="/tenancy" />
      <TenancyForm
        action="edit"
        landlords={refs.landlords.map((landlord) => ({ id: landlord.id, name: landlord.name }))}
        properties={refs.properties.map((property) => ({
          id: property.id,
          name: property.name,
          landlordName: property.landlord?.name
        }))}
        tenants={refs.tenants.map((tenant) => ({
          id: tenant.id,
          firstName: tenant.firstName,
          surname: tenant.surname,
          phoneNumber: tenant.phoneNumber
        }))}
        tenancy={{
          id: tenancy.id,
          propertyId: tenancy.propertyId,
          landlordId: tenancy.landlordId,
          startDate: tenancy.startDate.toISOString(),
          endDate: tenancy.endDate?.toISOString() ?? null,
          paymentDay: tenancy.paymentDay,
          depositAmount: tenancy.depositAmount.toString(),
          rentReviewDate: tenancy.rentReviewDate.toISOString(),
          selectedTenantIds: tenancy.tenancyParticipants.map((participant) => participant.tenantId),
          initialRentAmount: currentRent?.amount.toString() ?? "",
          initialRentEffectiveDate: currentRent?.effectiveDate.toISOString() ?? tenancy.startDate.toISOString()
        }}
      />
    </div>
  );
}
