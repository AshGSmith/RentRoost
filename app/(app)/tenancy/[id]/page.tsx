import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteRentChangeAction, deleteTenancyAction } from "@/app/(app)/tenancy/actions";
import { DomainNav } from "@/components/domain/domain-nav";
import { RentChangeForm } from "@/components/domain/rent-change-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { getTenantContext } from "@/lib/auth/tenant";
import { getTenancyDocument, getTenancyForUser, getTenancySummary } from "@/lib/domain/queries";
import { formatCurrency, formatDate } from "@/lib/domain/utils";

export default async function TenancyDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, query, { tenantUserId }] = await Promise.all([params, searchParams, getTenantContext()]);
  const tenancy = await getTenancyForUser(tenantUserId, id);

  if (!tenancy) {
    notFound();
  }

  const summary = getTenancySummary(tenancy);
  const agreementDocument = getTenancyDocument(tenancy);

  return (
    <div className="space-y-8">
      <PageHeader
        title={tenancy.property.name}
        description="Tenancy agreement details, current rent and history."
        actions={
          <div className="flex gap-3">
            <Button asChild variant="secondary">
              <Link href={`/tenancy/${tenancy.id}/edit`}>Edit</Link>
            </Button>
            <form action={deleteTenancyAction}>
              <input name="id" type="hidden" value={tenancy.id} />
              <Button type="submit" variant="danger">Delete</Button>
            </form>
          </div>
        }
      />
      <DomainNav activeHref="/tenancy" />
      {query.error ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{query.error}</p> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">Current rent</p>
          <p className="text-xl font-semibold text-slate-950 dark:text-white">
            {summary.currentRent ? formatCurrency(summary.currentRent.amount) : "No rent set"}
          </p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">Next payment date</p>
          <p className="text-xl font-semibold text-slate-950 dark:text-white">{formatDate(summary.nextPaymentDate)}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">Deposit</p>
          <p className="text-xl font-semibold text-slate-950 dark:text-white">{formatCurrency(summary.depositAmount)}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">Rent review</p>
          <p className="text-xl font-semibold text-slate-950 dark:text-white">{formatDate(tenancy.rentReviewDate)}</p>
        </Card>
      </div>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {summary.linkedTenants.map((tenant) => (
            <Badge key={`${tenant.firstName}-${tenant.surname}`}>{tenant.firstName} {tenant.surname}</Badge>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <p className="text-sm text-slate-500 dark:text-slate-400">Property</p>
            <p className="font-medium text-slate-950 dark:text-white">{tenancy.property.name}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-slate-500 dark:text-slate-400">Landlord</p>
            <p className="font-medium text-slate-950 dark:text-white">{tenancy.landlord?.name ?? tenancy.property.landlord?.name ?? "Not linked"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-slate-500 dark:text-slate-400">Tenancy dates</p>
            <p className="font-medium text-slate-950 dark:text-white">
              {formatDate(tenancy.startDate)} to {tenancy.endDate ? formatDate(tenancy.endDate) : "Open-ended"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-slate-500 dark:text-slate-400">Payment day</p>
            <p className="font-medium text-slate-950 dark:text-white">Day {tenancy.paymentDay}</p>
          </div>
        </div>
        {agreementDocument ? (
          <Button asChild variant="secondary">
            <Link href={`/api/tenancies/${tenancy.id}/document`}>Download agreement document</Link>
          </Button>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">No agreement document uploaded yet.</p>
        )}
      </Card>

      <DataTable
        headers={["Amount", "Effective date", "Actions"]}
        rows={tenancy.rentChanges.map((change) => [
          formatCurrency(change.amount),
          formatDate(change.effectiveDate),
          <div className="flex gap-2" key={change.id}>
            <Button asChild size="sm" variant="secondary">
              <Link href={`/tenancy/${tenancy.id}/rent-changes/${change.id}/edit`}>Edit</Link>
            </Button>
            <form action={deleteRentChangeAction}>
              <input name="id" type="hidden" value={change.id} />
              <input name="tenancyAgreementId" type="hidden" value={tenancy.id} />
              <Button size="sm" type="submit" variant="danger">Delete</Button>
            </form>
          </div>
        ])}
      />

      <RentChangeForm tenancyAgreementId={tenancy.id} />
    </div>
  );
}
