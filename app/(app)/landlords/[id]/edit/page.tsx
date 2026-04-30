import { notFound } from "next/navigation";

import { DomainNav } from "@/components/domain/domain-nav";
import { LandlordForm } from "@/components/domain/landlord-form";
import { PageHeader } from "@/components/ui/page-header";
import { getTenantContext } from "@/lib/auth/tenant";
import { getLandlordForUser } from "@/lib/domain/queries";

export default async function EditLandlordPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { tenantUserId }] = await Promise.all([params, getTenantContext()]);
  const landlord = await getLandlordForUser(tenantUserId, id);

  if (!landlord) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Edit landlord" description="Update landlord details and notes." />
      <DomainNav activeHref="/landlords" />
      <LandlordForm
        action="edit"
        landlord={{
          id: landlord.id,
          name: landlord.name,
          email: landlord.email,
          phoneNumber: landlord.phoneNumber,
          notes: landlord.notes
        }}
      />
    </div>
  );
}
