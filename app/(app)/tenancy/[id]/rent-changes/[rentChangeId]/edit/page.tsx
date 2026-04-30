import { notFound } from "next/navigation";

import { DomainNav } from "@/components/domain/domain-nav";
import { RentChangeForm } from "@/components/domain/rent-change-form";
import { PageHeader } from "@/components/ui/page-header";
import { getTenantContext } from "@/lib/auth/tenant";
import { getTenancyForUser } from "@/lib/domain/queries";

export default async function EditRentChangePage({
  params
}: {
  params: Promise<{ id: string; rentChangeId: string }>;
}) {
  const [{ id, rentChangeId }, { tenantUserId }] = await Promise.all([params, getTenantContext()]);
  const tenancy = await getTenancyForUser(tenantUserId, id);

  if (!tenancy) {
    notFound();
  }

  const rentChange = tenancy.rentChanges.find((change) => change.id === rentChangeId);

  if (!rentChange) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Edit rent change" description="Update a historical or upcoming rent change without losing the previous record trail." />
      <DomainNav activeHref="/tenancy" />
      <RentChangeForm
        rentChange={{
          id: rentChange.id,
          amount: rentChange.amount.toString(),
          effectiveDate: rentChange.effectiveDate.toISOString().slice(0, 10)
        }}
        tenancyAgreementId={tenancy.id}
      />
    </div>
  );
}
