import Link from "next/link";
import { Home } from "lucide-react";

import { DomainNav } from "@/components/domain/domain-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getTenantContext } from "@/lib/auth/tenant";
import { getCurrentRent, listTenanciesForUser } from "@/lib/domain/queries";
import { formatCurrency, formatDate } from "@/lib/domain/utils";

export default async function TenancyPage() {
  const { tenantUserId } = await getTenantContext();
  const tenancies = await listTenanciesForUser(tenantUserId);

  return (
    <div className="space-y-8">
      <PageHeader
        description="Manage tenancy agreements, tenant links, rent history and agreement documents."
        title="Tenancies"
        actions={
          <Button asChild>
            <Link href="/tenancy/new">New tenancy</Link>
          </Button>
        }
      />
      <DomainNav activeHref="/tenancy" />

      {tenancies.length === 0 ? (
        <EmptyState
          description="Create your first tenancy agreement to start tracking rent, deposits, payment dates and linked tenants."
          icon={<Home className="h-5 w-5" />}
          title="No tenancies yet"
          action={
            <Button asChild>
              <Link href="/tenancy/new">Create tenancy</Link>
            </Button>
          }
        />
      ) : (
        <DataTable
          headers={["Property", "Tenants", "Current rent", "Payment", "Deposit", "Open"]}
          rows={tenancies.map((tenancy) => [
            <div className="space-y-1" key={tenancy.id}>
              <p className="font-medium text-slate-950 dark:text-white">{tenancy.property.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {formatDate(tenancy.startDate)} to {tenancy.endDate ? formatDate(tenancy.endDate) : "Open-ended"}
              </p>
            </div>,
            <div className="flex flex-wrap gap-2" key={`${tenancy.id}-tenants`}>
              {tenancy.tenancyParticipants.map((participant) => (
                <Badge key={participant.id}>{participant.tenant.firstName} {participant.tenant.surname}</Badge>
              ))}
            </div>,
            getCurrentRent(tenancy) ? formatCurrency(getCurrentRent(tenancy)!.amount) : "No rent set",
            `Day ${tenancy.paymentDay}`,
            formatCurrency(tenancy.depositAmount),
            <Button asChild key={`${tenancy.id}-open`} size="sm" variant="secondary">
              <Link href={`/tenancy/${tenancy.id}`}>View</Link>
            </Button>
          ])}
        />
      )}
    </div>
  );
}
