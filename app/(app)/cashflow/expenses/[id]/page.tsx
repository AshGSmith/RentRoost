import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteExpenseAction } from "@/app/(app)/cashflow/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getTenantContext, getTenantSettings } from "@/lib/auth/tenant";
import { formatCurrency, formatDate } from "@/lib/domain/utils";
import { getExpenseEntry } from "@/lib/finance/service";

export default async function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { tenantUserId }, { settings }] = await Promise.all([params, getTenantContext(), getTenantSettings()]);
  const entry = await getExpenseEntry(tenantUserId, id);

  if (!entry) notFound();

  const currency = settings?.currencyDesignator ?? "£";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Expense detail"
        description={entry.description}
        actions={
          <div className="flex gap-3">
            <Button asChild variant="secondary">
              <Link href={`/cashflow/expenses/${entry.id}/edit`}>Edit</Link>
            </Button>
            <form action={deleteExpenseAction}>
              <input name="id" type="hidden" value={entry.id} />
              <Button type="submit" variant="danger">Delete</Button>
            </form>
          </div>
        }
      />
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="space-y-2"><p className="text-sm text-slate-500 dark:text-slate-400">Gross</p><p className="font-semibold text-slate-950 dark:text-white">{formatCurrency(entry.grossAmount, currency)}</p></Card>
        <Card className="space-y-2"><p className="text-sm text-slate-500 dark:text-slate-400">Net</p><p className="font-semibold text-slate-950 dark:text-white">{formatCurrency(entry.netAmount, currency)}</p></Card>
        <Card className="space-y-2"><p className="text-sm text-slate-500 dark:text-slate-400">VAT</p><p className="font-semibold text-slate-950 dark:text-white">{formatCurrency(entry.vatAmount, currency)}</p></Card>
        <Card className="space-y-2"><p className="text-sm text-slate-500 dark:text-slate-400">Due date</p><p className="font-semibold text-slate-950 dark:text-white">{formatDate(entry.dueDate)}</p></Card>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="space-y-2"><p className="text-sm text-slate-500 dark:text-slate-400">Category</p><p className="font-semibold text-slate-950 dark:text-white">{entry.category.name}</p></Card>
        <Card className="space-y-2"><p className="text-sm text-slate-500 dark:text-slate-400">Supplier</p><p className="font-semibold text-slate-950 dark:text-white">{entry.supplier}</p></Card>
        <Card className="space-y-2"><p className="text-sm text-slate-500 dark:text-slate-400">Status</p><p className="font-semibold text-slate-950 dark:text-white">{entry.paid ? "Paid" : "Outstanding"}</p></Card>
        <Card className="space-y-2"><p className="text-sm text-slate-500 dark:text-slate-400">Scope</p><p className="font-semibold text-slate-950 dark:text-white">{entry.organisationExpense ? "Organisation expense" : entry.tenancyAgreement?.property.name ?? "Tenancy linked"}</p></Card>
      </div>
      <Card className="space-y-2">
        <p className="text-sm text-slate-500 dark:text-slate-400">Invoice number</p>
        <p className="text-sm text-slate-700 dark:text-slate-300">{entry.invoiceNumber ?? "Not provided"}</p>
      </Card>
    </div>
  );
}
