import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteLandlordAction } from "@/app/(app)/landlords/actions";
import { DomainNav } from "@/components/domain/domain-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { getTenantContext } from "@/lib/auth/tenant";
import { getLandlordForUser } from "@/lib/domain/queries";
import { formatDate } from "@/lib/domain/utils";

export default async function LandlordDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, query, { tenantUserId }] = await Promise.all([params, searchParams, getTenantContext()]);
  const landlord = await getLandlordForUser(tenantUserId, id);

  if (!landlord) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={landlord.name}
        description="Landlord overview and linked records."
        actions={
          <div className="flex gap-3">
            <Button asChild variant="secondary">
              <Link href={`/landlords/${landlord.id}/edit`}>Edit</Link>
            </Button>
            <form action={deleteLandlordAction}>
              <input name="id" type="hidden" value={landlord.id} />
              <Button type="submit" variant="danger">Delete</Button>
            </form>
          </div>
        }
      />
      <DomainNav activeHref="/landlords" />
      {query.error ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{query.error}</p> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">Email</p>
          <p className="font-medium text-slate-950 dark:text-white">{landlord.email ?? "Not set"}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">Phone</p>
          <p className="font-medium text-slate-950 dark:text-white">{landlord.phoneNumber ?? "Not set"}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">Created</p>
          <p className="font-medium text-slate-950 dark:text-white">{formatDate(landlord.createdAt)}</p>
        </Card>
      </div>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Notes</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">{landlord.notes ?? "No notes added yet."}</p>
      </Card>

      <DataTable
        headers={["Properties", "Address"]}
        rows={
          landlord.properties.length > 0
            ? landlord.properties.map((property) => [
                <Link className="font-medium text-brand-700 dark:text-brand-300" href={`/properties/${property.id}`} key={property.id}>
                  {property.name}
                </Link>,
                `${property.addressLine1}, ${property.city}, ${property.postcode}`
              ])
            : [[<span key="none">No linked properties</span>, ""]]
        }
      />
    </div>
  );
}
