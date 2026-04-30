import Link from "next/link";
import { Building2 } from "lucide-react";

import { DomainNav } from "@/components/domain/domain-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { getTenantContext } from "@/lib/auth/tenant";
import { listLandlordsForUser } from "@/lib/domain/queries";

export default async function LandlordsPage() {
  const { tenantUserId } = await getTenantContext();
  const landlords = await listLandlordsForUser(tenantUserId);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Landlords"
        description="Track landlord contacts and connect them to properties and tenancy agreements."
        actions={
          <Button asChild>
            <Link href="/landlords/new">New landlord</Link>
          </Button>
        }
      />
      <DomainNav activeHref="/landlords" />

      {landlords.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-5 w-5" />}
          title="No landlords yet"
          description="Create your first landlord profile so properties and tenancies can be linked cleanly."
          action={
            <Button asChild>
              <Link href="/landlords/new">Create landlord</Link>
            </Button>
          }
        />
      ) : (
        <DataTable
          headers={["Landlord", "Contact", "Links", "Open"]}
          rows={landlords.map((landlord) => [
            <div className="space-y-1" key={`${landlord.id}-name`}>
              <p className="font-medium text-slate-950 dark:text-white">{landlord.name}</p>
              {landlord.email ? <p className="text-xs text-slate-500 dark:text-slate-400">{landlord.email}</p> : null}
            </div>,
            landlord.phoneNumber ?? "Not set",
            <div className="flex items-center gap-2" key={`${landlord.id}-links`}>
              <Badge>{landlord._count.properties} properties</Badge>
              <Badge variant="success">{landlord._count.tenancyAgreements} tenancies</Badge>
            </div>,
            <Button asChild key={`${landlord.id}-open`} size="sm" variant="secondary">
              <Link href={`/landlords/${landlord.id}`}>View</Link>
            </Button>
          ])}
        />
      )}
    </div>
  );
}
