import Link from "next/link";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { TileCard } from "@/components/ui/tile-card";
import { getTenantContext, getTenantSettings } from "@/lib/auth/tenant";
import { formatCurrency, formatDate } from "@/lib/domain/utils";
import {
  calculateCashflowSummaries,
  listExpenseEntries,
  listIncomeEntries
} from "@/lib/finance/service";

export default async function CashflowPage({
  searchParams
}: {
  searchParams: Promise<{ tab?: "income" | "expense" }>;
}) {
  const [{ tab }, { tenantUserId }, { settings }] = await Promise.all([
    searchParams,
    getTenantContext(),
    getTenantSettings()
  ]);
  const currency = settings?.currencyDesignator ?? "£";
  const [incomeEntries, expenseEntries, summaries] = await Promise.all([
    listIncomeEntries(tenantUserId),
    listExpenseEntries(tenantUserId),
    calculateCashflowSummaries(tenantUserId)
  ]);

  const incomeContent = (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <TileCard icon={<ArrowUpCircle className="h-5 w-5" />} label="Month to Date" value={formatCurrency(summaries.income.monthToDate, currency)} />
        <TileCard icon={<ArrowUpCircle className="h-5 w-5" />} label="Year to Date" value={formatCurrency(summaries.income.yearToDate, currency)} />
      </div>
      {incomeEntries.length === 0 ? (
        <EmptyState
          title="No income logged yet"
          description="Capture rent receipts and other incoming funds here."
          action={
            <Button asChild>
              <Link href="/cashflow/income/new">New income</Link>
            </Button>
          }
        />
      ) : (
        <DataTable
          headers={["Date", "Category", "Tenancy", "Amount", "Open"]}
          rows={incomeEntries.map((entry) => [
            formatDate(entry.paymentDate),
            entry.category.name,
            entry.tenancyAgreement?.property.name ?? "Unlinked",
            formatCurrency(entry.amount, currency),
            <Button asChild key={entry.id} size="sm" variant="secondary">
              <Link href={`/cashflow/income/${entry.id}`}>View</Link>
            </Button>
          ])}
        />
      )}
    </div>
  );

  const expenseContent = (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <TileCard icon={<ArrowDownCircle className="h-5 w-5" />} label="Month to Date" value={formatCurrency(summaries.expense.monthToDate, currency)} />
        <TileCard icon={<ArrowDownCircle className="h-5 w-5" />} label="Year to Date" value={formatCurrency(summaries.expense.yearToDate, currency)} />
      </div>
      {expenseEntries.length === 0 ? (
        <EmptyState
          title="No expenses logged yet"
          description="Capture supplier costs, VAT-inclusive spend and organisation expenses here."
          action={
            <Button asChild>
              <Link href="/cashflow/expenses/new">New expense</Link>
            </Button>
          }
        />
      ) : (
        <DataTable
          headers={["Due date", "Category", "Supplier", "Status", "Amount", "Open"]}
          rows={expenseEntries.map((entry) => [
            formatDate(entry.dueDate),
            entry.category.name,
            entry.supplier,
            entry.paid ? "Paid" : "Outstanding",
            formatCurrency(entry.grossAmount, currency),
            <Button asChild key={entry.id} size="sm" variant="secondary">
              <Link href={`/cashflow/expenses/${entry.id}`}>View</Link>
            </Button>
          ])}
        />
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Cashflow"
        description="Track income, expenses and summary totals using your current financial year."
        actions={
          <div className="flex gap-3">
            <Button asChild variant="secondary">
              <Link href="/cashflow/categories">Manage categories</Link>
            </Button>
            <Button asChild>
              <Link href={tab === "expense" ? "/cashflow/expenses/new" : "/cashflow/income/new"}>
                {tab === "expense" ? "New expense" : "New income"}
              </Link>
            </Button>
          </div>
        }
      />

      <Tabs
        defaultValue={tab === "expense" ? "expense" : "income"}
        tabs={[
          { value: "income", label: "Income", content: incomeContent },
          { value: "expense", label: "Expense", content: expenseContent }
        ]}
      />
    </div>
  );
}
