import Link from "next/link";
import { Users } from "lucide-react";

import { DomainNav } from "@/components/domain/domain-nav";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getTenantContext } from "@/lib/auth/tenant";
import { listTenantsForUser } from "@/lib/domain/queries";

export default async function TenantsPage() {
  const { tenantUserId } = await getTenantContext();
  const tenants = await listTenantsForUser(tenantUserId);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Tenants"
        description="Maintain tenant contact details and link them to one or more tenancy agreements."
        actions={
          <Button asChild>
            <Link href="/tenants/new">New tenant</Link>
          </Button>
        }
      />
      <DomainNav activeHref="/tenants" />
      {tenants.length === 0 ? (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title="No tenants yet"
          description="Create your first tenant record or add one inline while creating a tenancy."
          action={
            <Button asChild>
              <Link href="/tenants/new">Create tenant</Link>
            </Button>
          }
        />
      ) : (
        <DataTable
          headers={["Tenant", "Phone", "Email", "Tenancies", "Open"]}
          rows={tenants.map((tenant) => [
            `${tenant.firstName} ${tenant.surname}`,
            tenant.phoneNumber,
            tenant.email ?? "Not set",
            String(tenant._count.tenancyParticipants),
            <Button asChild key={`${tenant.id}-open`} size="sm" variant="secondary">
              <Link href={`/tenants/${tenant.id}`}>View</Link>
            </Button>
          ])}
        />
      )}
    </div>
  );
}
