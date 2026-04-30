import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarClock, PoundSterling } from "lucide-react";

import { CashflowChart } from "@/components/reports/cashflow-chart";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getTenantContext, getTenantSettings } from "@/lib/auth/tenant";
import { formatCurrency, formatDate } from "@/lib/domain/utils";
import { parseFinancialYearStartYear } from "@/lib/finance/summary";
import { getDashboardMetrics } from "@/lib/reports/service";

function StatLinkCard({
  href,
  title,
  value,
  meta,
  tone
}: {
  href: string;
  title: string;
  value: string;
  meta: string;
  tone: "green" | "red";
}) {
  const toneClasses =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100"
      : "border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-100";

  return (
    <Link href={href}>
      <Card className={`space-y-4 transition hover:shadow-card ${toneClasses}`}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium">{title}</p>
          <ArrowRight className="h-4 w-4 opacity-70" />
        </div>
        <div className="space-y-1">
          <p className="text-3xl font-semibold tracking-tight">{value}</p>
          <p className="text-sm opacity-80">{meta}</p>
        </div>
      </Card>
    </Link>
  );
}

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const [{ year }, { viewer, tenantUserId }, { settings }] = await Promise.all([
    searchParams,
    getTenantContext(),
    getTenantSettings()
  ]);

  const selectedYear = parseFinancialYearStartYear(year);
  const currency = settings?.currencyDesignator ?? "£";
  const dashboard = await getDashboardMetrics(tenantUserId, selectedYear);

  return (
    <div className="space-y-8">
      <PageHeader
        description="Track rent performance, expiring compliance reminders, and year-to-date cashflow from one place."
        title={`Welcome back, ${viewer.firstName}`}
      />

      <div className={`grid gap-4 ${dashboard.upcomingReminders.length > 0 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        <StatLinkCard
          href="/cashflow?tab=income"
          meta="Opens Cashflow income"
          title="Rent Received this Month"
          tone="green"
          value={formatCurrency(dashboard.rentReceivedThisMonth, currency)}
        />
        <StatLinkCard
          href="/cashflow?tab=income"
          meta="Active tenancies with unpaid rent due this month"
          title="Rent Overdue"
          tone="red"
          value={formatCurrency(dashboard.rentOverdue, currency)}
        />
        {dashboard.upcomingReminders.length > 0 ? (
          <Card className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-slate-950 dark:text-white">Upcoming incomplete reminders</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Due within the next 60 days.
                </p>
              </div>
              <CalendarClock className="h-5 w-5 text-brand-600 dark:text-brand-300" />
            </div>
            <div className="space-y-3">
              {dashboard.upcomingReminders.slice(0, 4).map((reminder) => {
                const toneClasses =
                  reminder.urgency === "red"
                    ? "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-100"
                    : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100";

                return (
                  <Link
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 transition hover:shadow-sm ${toneClasses}`}
                    href={`/reminders/${reminder.id}`}
                    key={reminder.id}
                  >
                    <div>
                      <p className="font-medium">{reminder.description}</p>
                      <p className="text-xs opacity-80">Due {formatDate(reminder.dueDate)}</p>
                    </div>
                    <AlertTriangle className="h-4 w-4" />
                  </Link>
                );
              })}
            </div>
          </Card>
        ) : null}
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Cashflow year to date</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Monthly income versus expenses for {dashboard.selectedFinancialYearLabel}.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
              href={`/dashboard?year=${selectedYear - 1}`}
            >
              Previous year
            </Link>
            <Link
              className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
              href={`/reports?year=${selectedYear}`}
            >
              Open reports
            </Link>
          </div>
        </div>

        <Link className="block" href={`/reports?year=${selectedYear}`}>
          <CashflowChart
            currencyDesignator={currency}
            data={dashboard.cashflowSeries}
            description="Click through to Reports for financial-year analysis and PDF export."
            title={`${dashboard.selectedFinancialYearLabel} cashflow`}
          />
        </Link>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-4 border-blue-200 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/20">
        <div className="space-y-1">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Reports and exports</p>
          <p className="text-sm text-blue-800/80 dark:text-blue-200/80">
            Open the full financial-year report with tenancy and organisation expense breakdowns.
          </p>
        </div>
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
          href={`/reports?year=${selectedYear}`}
        >
          <PoundSterling className="h-4 w-4" />
          View reports
        </Link>
      </Card>
    </div>
  );
}
