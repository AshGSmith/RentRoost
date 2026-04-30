import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteTenantAction } from "@/app/(app)/tenants/actions";
import { DomainNav } from "@/components/domain/domain-nav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { getTenantContext } from "@/lib/auth/tenant";
import { getCurrentRent, getTenantForUser } from "@/lib/domain/queries";
import { formatCurrency, formatDate } from "@/lib/domain/utils";

export default async function TenantDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, query, { tenantUserId }] = await Promise.all([params, searchParams, getTenantContext()]);
  const tenant = await getTenantForUser(tenantUserId, id);

  if (!tenant) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${tenant.firstName} ${tenant.surname}`}
        description="Tenant contact details and linked tenancy agreements."
        actions={
          <div className="flex gap-3">
            <Button asChild variant="secondary">
              <Link href={`/tenants/${tenant.id}/edit`}>Edit</Link>
            </Button>
            <form action={deleteTenantAction}>
              <input name="id" type="hidden" value={tenant.id} />
              <Button type="submit" variant="danger">Delete</Button>
            </form>
          </div>
        }
      />
      <DomainNav activeHref="/tenants" />
      {query.error ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{query.error}</p> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">Phone</p>
          <p className="font-medium text-slate-950 dark:text-white">{tenant.phoneNumber}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">Email</p>
          <p className="font-medium text-slate-950 dark:text-white">{tenant.email ?? "Not set"}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">Created</p>
          <p className="font-medium text-slate-950 dark:text-white">{formatDate(tenant.createdAt)}</p>
        </Card>
      </div>

      <DataTable
        headers={["Tenancy", "Property", "Dates", "Current rent"]}
        rows={
          tenant.tenancyParticipants.length > 0
            ? tenant.tenancyParticipants.map((participant) => [
                <Link className="font-medium text-brand-700 dark:text-brand-300" href={`/tenancy/${participant.tenancyAgreement.id}`} key={participant.id}>
                  View tenancy
                </Link>,
                participant.tenancyAgreement.property.name,
                `${formatDate(participant.tenancyAgreement.startDate)} to ${participant.tenancyAgreement.endDate ? formatDate(participant.tenancyAgreement.endDate) : "Open-ended"}`,
                getCurrentRent(participant.tenancyAgreement)
                  ? formatCurrency(getCurrentRent(participant.tenancyAgreement)!.amount)
                  : "No rent set"
              ])
            : [[<span key="none">No tenancy agreements</span>, "", "", ""]]
        }
      />
    </div>
  );
}
