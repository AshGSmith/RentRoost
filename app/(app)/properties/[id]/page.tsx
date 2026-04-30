import Link from "next/link";
import { notFound } from "next/navigation";

import { deletePropertyAction } from "@/app/(app)/properties/actions";
import { DomainNav } from "@/components/domain/domain-nav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { getTenantContext } from "@/lib/auth/tenant";
import { getCurrentRent, getPropertyForUser } from "@/lib/domain/queries";
import { formatCurrency, formatDate } from "@/lib/domain/utils";

export default async function PropertyDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, query, { tenantUserId }] = await Promise.all([params, searchParams, getTenantContext()]);
  const property = await getPropertyForUser(tenantUserId, id);

  if (!property) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={property.name}
        description={`${property.addressLine1}, ${property.city}, ${property.postcode}`}
        actions={
          <div className="flex gap-3">
            <Button asChild variant="secondary">
              <Link href={`/properties/${property.id}/edit`}>Edit</Link>
            </Button>
            <form action={deletePropertyAction}>
              <input name="id" type="hidden" value={property.id} />
              <Button type="submit" variant="danger">Delete</Button>
            </form>
          </div>
        }
      />
      <DomainNav activeHref="/properties" />
      {query.error ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{query.error}</p> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">Landlord</p>
          <p className="font-medium text-slate-950 dark:text-white">{property.landlord?.name ?? "Unassigned"}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">Tenancies</p>
          <p className="font-medium text-slate-950 dark:text-white">{property.tenancyAgreements.length}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">Added</p>
          <p className="font-medium text-slate-950 dark:text-white">{formatDate(property.createdAt)}</p>
        </Card>
      </div>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Notes</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">{property.notes ?? "No notes added yet."}</p>
      </Card>

      <DataTable
        headers={["Tenancy", "Dates", "Current rent", "Tenants"]}
        rows={
          property.tenancyAgreements.length > 0
            ? property.tenancyAgreements.map((tenancy) => [
                <Link className="font-medium text-brand-700 dark:text-brand-300" href={`/tenancy/${tenancy.id}`} key={tenancy.id}>
                  View tenancy
                </Link>,
                `${formatDate(tenancy.startDate)} to ${tenancy.endDate ? formatDate(tenancy.endDate) : "Open-ended"}`,
                getCurrentRent(tenancy) ? formatCurrency(getCurrentRent(tenancy)!.amount) : "No rent set",
                tenancy.tenancyParticipants.map((participant) => `${participant.tenant.firstName} ${participant.tenant.surname}`).join(", ")
              ])
            : [[<span key="none">No tenancy agreements</span>, "", "", ""]]
        }
      />
    </div>
  );
}
