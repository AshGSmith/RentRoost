import Link from "next/link";
import { Building2, RefreshCcw, ShieldCheck } from "lucide-react";

import { UserAutoReconcileForm } from "@/components/reconcile/user-auto-reconcile-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { TileCard } from "@/components/ui/tile-card";
import { getTenantContext } from "@/lib/auth/tenant";
import { listBankAccounts, getReconcileReferenceData } from "@/lib/reconcile/service";

export default async function ReconcilePage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { tenantUserId } = await getTenantContext();
  const [{ error }, accounts, refs] = await Promise.all([
    searchParams,
    listBankAccounts(tenantUserId),
    getReconcileReferenceData(tenantUserId)
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reconcile"
        description="Review imported bank activity, reconcile transactions into cashflow, and save memorised matches."
        actions={
          <Button asChild>
            <Link href="/reconcile/accounts/new">Add bank account</Link>
          </Button>
        }
      />

      {error ? (
        <Card className="border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-100">
          Provider action failed: {error}
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <TileCard icon={<Building2 className="h-5 w-5" />} label="Connected accounts" value={String(accounts.length)} />
        <TileCard
          icon={<RefreshCcw className="h-5 w-5" />}
          label="Auto reconciliation"
          value={refs.userAutoReconciliationEnabled ? "Enabled" : "Disabled"}
        />
        <TileCard
          icon={<ShieldCheck className="h-5 w-5" />}
          label="Confidence threshold"
          value={`${refs.userAutoReconciliationMinConfidence}%`}
        />
      </div>

      <Card className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">User defaults</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            These defaults apply unless a bank account overrides them.
          </p>
        </div>
        <UserAutoReconcileForm
          enabled={refs.userAutoReconciliationEnabled}
          minConfidence={refs.userAutoReconciliationMinConfidence}
        />
      </Card>

      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Connected bank accounts</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Use manual import for testing or connect a live TrueLayer feed for secure account sync.
          </p>
        </div>

        {accounts.length === 0 ? (
          <EmptyState
            title="No bank accounts yet"
            description="Add your first account to start importing transactions, testing matches, and reconciling into income or expenses."
            action={
              <Button asChild>
                <Link href="/reconcile/accounts/new">Add bank account</Link>
              </Button>
            }
          />
        ) : (
          <DataTable
            headers={[
              "Account",
              "Institution",
              "Provider",
              "Connection",
              "Transactions",
              "Rules",
              "Auto reconcile",
              "Open"
            ]}
            rows={accounts.map((account) => [
              account.name,
              account.institutionName || "Not set",
              account.provider === "manual" ? "Manual stub" : account.provider,
              account.connectionStatus,
              String(account._count.transactions),
              String(account._count.reconciliationRules),
              account.autoReconciliationEnabled == null
                ? `User default (${refs.userAutoReconciliationEnabled ? "on" : "off"})`
                : account.autoReconciliationEnabled
                  ? "Enabled"
                  : "Disabled",
              <Button asChild key={account.id} size="sm" variant="secondary">
                <Link href={`/reconcile/${account.id}`}>Open</Link>
              </Button>
            ])}
          />
        )}
      </div>
    </div>
  );
}
