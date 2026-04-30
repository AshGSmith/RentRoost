import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteIncomeAction } from "@/app/(app)/cashflow/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getTenantContext, getTenantSettings } from "@/lib/auth/tenant";
import { formatCurrency, formatDate } from "@/lib/domain/utils";
import { getIncomeEntry } from "@/lib/finance/service";

export default async function IncomeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { tenantUserId }, { settings }] = await Promise.all([params, getTenantContext(), getTenantSettings()]);
  const entry = await getIncomeEntry(tenantUserId, id);

  if (!entry) notFound();

  const currency = settings?.currencyDesignator ?? "£";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Income detail"
        description={entry.category.name}
        actions={
          <div className="flex gap-3">
            <Button asChild variant="secondary">
              <Link href={`/cashflow/income/${entry.id}/edit`}>Edit</Link>
            </Button>
            <form action={deleteIncomeAction}>
              <input name="id" type="hidden" value={entry.id} />
              <Button type="submit" variant="danger">Delete</Button>
            </form>
          </div>
        }
      />
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="space-y-2"><p className="text-sm text-slate-500 dark:text-slate-400">Amount</p><p className="font-semibold text-slate-950 dark:text-white">{formatCurrency(entry.amount, currency)}</p></Card>
        <Card className="space-y-2"><p className="text-sm text-slate-500 dark:text-slate-400">Payment date</p><p className="font-semibold text-slate-950 dark:text-white">{formatDate(entry.paymentDate)}</p></Card>
        <Card className="space-y-2"><p className="text-sm text-slate-500 dark:text-slate-400">Category</p><p className="font-semibold text-slate-950 dark:text-white">{entry.category.name}</p></Card>
        <Card className="space-y-2"><p className="text-sm text-slate-500 dark:text-slate-400">Tenancy</p><p className="font-semibold text-slate-950 dark:text-white">{entry.tenancyAgreement?.property.name ?? "Unlinked"}</p></Card>
      </div>
      <Card className="space-y-2">
        <p className="text-sm text-slate-500 dark:text-slate-400">Notes</p>
        <p className="text-sm text-slate-700 dark:text-slate-300">{entry.notes ?? "No notes provided."}</p>
      </Card>
    </div>
  );
}
