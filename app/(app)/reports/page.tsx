import Image from "next/image";
import Link from "next/link";
import { Download, FileBarChart2, Landmark, TrendingDown, TrendingUp } from "lucide-react";

import { CashflowChart } from "@/components/reports/cashflow-chart";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { TileCard } from "@/components/ui/tile-card";
import { getTenantContext } from "@/lib/auth/tenant";
import { formatCurrency, formatDate } from "@/lib/domain/utils";
import { parseFinancialYearStartYear } from "@/lib/finance/summary";
import {
  getFinancialYearOptions,
  getFinancialYearReportData
} from "@/lib/reports/service";

export default async function ReportsPage({
  searchParams
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const [{ year }, { tenantUserId }] = await Promise.all([searchParams, getTenantContext()]);
  const selectedYear = parseFinancialYearStartYear(year);
  const [report, yearOptions] = await Promise.all([
    getFinancialYearReportData(tenantUserId, selectedYear),
    Promise.resolve(getFinancialYearOptions(6))
  ]);

  const pdfHref = `/api/reports/financial-year?year=${selectedYear}`;

  return (
    <div className="space-y-8">
      <PageHeader
        description="Financial-year reporting for tax filing, portfolio review, and branded PDF exports."
        title="Reports"
        actions={
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="secondary">
              <Link href={`/reports?year=${selectedYear - 1}`}>Previous year</Link>
            </Button>
            <Button asChild>
              <Link href={pdfHref}>
                <Download className="h-4 w-4" />
                Download PDF
              </Link>
            </Button>
          </div>
        }
      />

      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Selected financial year</p>
          <h2 className="text-xl font-semibold text-slate-950 dark:text-white">{report.selectedFinancialYearLabel}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {formatDate(report.range.start)} to {formatDate(new Date(report.range.end.getTime() - 86400000))}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {yearOptions.map((option) => (
            <Link
              className={`inline-flex h-10 items-center rounded-xl px-4 text-sm font-medium transition ${
                option.startYear === selectedYear
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
              }`}
              href={`/reports?year=${option.startYear}`}
              key={option.startYear}
            >
              {option.label}
            </Link>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <TileCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Total income"
          value={formatCurrency(report.totals.income, report.currencyDesignator)}
        />
        <TileCard
          icon={<TrendingDown className="h-5 w-5" />}
          label="Total expenses"
          value={formatCurrency(report.totals.expense, report.currencyDesignator)}
        />
        <TileCard
          icon={<Landmark className="h-5 w-5" />}
          label="Tenancy-linked expenses"
          value={formatCurrency(report.totals.tenancyLinkedExpense, report.currencyDesignator)}
        />
        <TileCard
          icon={<FileBarChart2 className="h-5 w-5" />}
          label="Organisation expenses"
          value={formatCurrency(report.totals.organisationExpense, report.currencyDesignator)}
        />
      </div>

      <Card className="space-y-4 print:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Branded report header</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              This branding is applied to the downloadable PDF too.
            </p>
          </div>
          {report.organisationLogoDataUrl ? (
            <Image
              alt={`${report.organisation?.organisationName ?? "Organisation"} logo`}
              className="max-h-14 w-auto rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800"
              height={56}
              src={report.organisationLogoDataUrl}
              unoptimized
              width={160}
            />
          ) : null}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-xl font-semibold text-slate-950 dark:text-white">
            {report.organisation?.organisationName ?? "Organisation details not configured"}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Financial year income and expense report for tax filing and internal review.
          </p>
        </div>
      </Card>

      <CashflowChart
        currencyDesignator={report.currencyDesignator}
        data={report.monthlySeries}
        description="Monthly totals follow the UK financial year from 6 April to 5 April."
        title={`${report.selectedFinancialYearLabel} income vs expenses`}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Income ledger</h2>
          {report.incomes.length === 0 ? (
            <EmptyState
              title="No income in this year"
              description="Income entries logged against the selected financial year will appear here."
            />
          ) : (
            <DataTable
              headers={["Date", "Category", "Tenancy", "Amount", "Notes"]}
              rows={report.incomes.map((entry) => [
                formatDate(entry.paymentDate),
                entry.category.name,
                entry.tenancyAgreement?.property.name ?? "Unlinked",
                formatCurrency(entry.amount, report.currencyDesignator),
                entry.notes ?? "None"
              ])}
            />
          )}
        </Card>

        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Expense ledger</h2>
          {report.expenses.length === 0 ? (
            <EmptyState
              title="No expenses in this year"
              description="Expense entries for the selected year will appear here once logged."
            />
          ) : (
            <DataTable
              headers={["Date", "Category", "Scope", "Gross", "VAT", "Supplier"]}
              rows={report.expenses.map((entry) => [
                formatDate(entry.dueDate),
                entry.category.name,
                entry.organisationExpense
                  ? "Organisation expense"
                  : entry.tenancyAgreement?.property.name ?? "Unlinked",
                formatCurrency(entry.grossAmount, report.currencyDesignator),
                formatCurrency(entry.vatAmount, report.currencyDesignator),
                entry.supplier
              ])}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
