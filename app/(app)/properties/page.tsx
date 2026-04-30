import Link from "next/link";
import { Building } from "lucide-react";

import { DomainNav } from "@/components/domain/domain-nav";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getTenantContext } from "@/lib/auth/tenant";
import { listPropertiesForUser } from "@/lib/domain/queries";

export default async function PropertiesPage() {
  const { tenantUserId } = await getTenantContext();
  const properties = await listPropertiesForUser(tenantUserId);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Properties"
        description="Manage your property portfolio and connect each address to tenancies."
        actions={
          <Button asChild>
            <Link href="/properties/new">New property</Link>
          </Button>
        }
      />
      <DomainNav activeHref="/properties" />
      {properties.length === 0 ? (
        <EmptyState
          icon={<Building className="h-5 w-5" />}
          title="No properties yet"
          description="Create a property record before assigning a tenancy agreement."
          action={
            <Button asChild>
              <Link href="/properties/new">Create property</Link>
            </Button>
          }
        />
      ) : (
        <DataTable
          headers={["Property", "Landlord", "Address", "Tenancies", "Open"]}
          rows={properties.map((property) => [
            <div className="space-y-1" key={property.id}>
              <p className="font-medium text-slate-950 dark:text-white">{property.name}</p>
            </div>,
            property.landlord?.name ?? "Unassigned",
            `${property.addressLine1}, ${property.city}, ${property.postcode}`,
            String(property._count.tenancyAgreements),
            <Button asChild key={`${property.id}-open`} size="sm" variant="secondary">
              <Link href={`/properties/${property.id}`}>View</Link>
            </Button>
          ])}
        />
      )}
    </div>
  );
}
