import { notFound } from "next/navigation";

import { DomainNav } from "@/components/domain/domain-nav";
import { TenantForm } from "@/components/domain/tenant-form";
import { PageHeader } from "@/components/ui/page-header";
import { getTenantContext } from "@/lib/auth/tenant";
import { getTenantForUser } from "@/lib/domain/queries";

export default async function EditTenantPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { tenantUserId }] = await Promise.all([params, getTenantContext()]);
  const tenant = await getTenantForUser(tenantUserId, id);

  if (!tenant) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Edit tenant" description="Update contact details for this tenant." />
      <DomainNav activeHref="/tenants" />
      <TenantForm
        action="edit"
        tenant={{
          id: tenant.id,
          firstName: tenant.firstName,
          surname: tenant.surname,
          phoneNumber: tenant.phoneNumber,
          email: tenant.email
        }}
      />
    </div>
  );
}
