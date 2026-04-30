import Link from "next/link";
import { BankTransactionStatus } from "@prisma/client";
import { ArrowRightLeft, CircleOff, ListFilter, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";

import {
  applySuggestedRuleAction,
  connectBankAccountAction,
  deleteBankAccountAction,
  deleteRuleAction,
  ignoreTransactionAction,
  syncBankAccountAction
} from "@/app/(app)/reconcile/actions";
import { ManualTransactionForm } from "@/components/reconcile/manual-transaction-form";
import { RuleForm } from "@/components/reconcile/rule-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { TileCard } from "@/components/ui/tile-card";
import { getTenantContext, getTenantSettings } from "@/lib/auth/tenant";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/domain/utils";
import {
  getBankAccount,
  getReconcileReferenceData,
  listBankAccountTransactions,
  listReconciliationRules
} from "@/lib/reconcile/service";

function buildTabHref(accountId: string, tab: string) {
  return `/reconcile/${accountId}?tab=${tab}`;
}

export default async function BankAccountDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: "review" | "reconciled" | "ignored" }>;
}) {
  const [{ id }, { tab }, { tenantUserId }, { settings }] = await Promise.all([
    params,
    searchParams,
    getTenantContext(),
    getTenantSettings()
  ]);

  const account = await getBankAccount(tenantUserId, id);
  if (!account) notFound();

  const activeTab = tab === "reconciled" || tab === "ignored" ? tab : "review";
  const currency = settings?.currencyDesignator ?? "£";

  const [reviewTransactions, reconciledTransactions, ignoredTransactions, refs, rules] =
    await Promise.all([
      listBankAccountTransactions(tenantUserId, id, BankTransactionStatus.REVIEW),
      listBankAccountTransactions(tenantUserId, id, BankTransactionStatus.RECONCILED),
      listBankAccountTransactions(tenantUserId, id, BankTransactionStatus.IGNORED),
      getReconcileReferenceData(tenantUserId),
      listReconciliationRules(tenantUserId, id)
    ]);

  const transactions =
    activeTab === "reconciled"
      ? reconciledTransactions
      : activeTab === "ignored"
        ? ignoredTransactions
        : reviewTransactions;

  const tabItems = [
    { value: "review", label: "Review", count: reviewTransactions.length },
    { value: "reconciled", label: "Reconciled", count: reconciledTransactions.length },
    { value: "ignored", label: "Ignored", count: ignoredTransactions.length }
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title={account.name}
        description="Review unreconciled bank activity, approve suggested matches, and manage account-specific import rules."
        actions={
          <div className="flex flex-wrap gap-3">
            {account.provider !== "manual" ? (
              account.connectionStatus === "CONNECTED" ? (
                <form action={syncBankAccountAction}>
                  <input name="id" type="hidden" value={account.id} />
                  <input name="redirectTo" type="hidden" value={buildTabHref(account.id, activeTab)} />
                  <Button type="submit">Sync now</Button>
                </form>
              ) : (
                <form action={connectBankAccountAction}>
                  <input name="id" type="hidden" value={account.id} />
                  <Button type="submit">Connect bank feed</Button>
                </form>
              )
            ) : null}
            <Button asChild variant="secondary">
              <Link href={`/reconcile/${account.id}/edit`}>Edit account</Link>
            </Button>
            <form action={deleteBankAccountAction}>
              <input name="id" type="hidden" value={account.id} />
              <Button type="submit" variant="danger">Delete</Button>
            </form>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <TileCard icon={<ArrowRightLeft className="h-5 w-5" />} label="Review" value={String(reviewTransactions.length)} />
        <TileCard icon={<ShieldCheck className="h-5 w-5" />} label="Reconciled" value={String(reconciledTransactions.length)} />
        <TileCard icon={<CircleOff className="h-5 w-5" />} label="Ignored" value={String(ignoredTransactions.length)} />
        <TileCard
          icon={<ListFilter className="h-5 w-5" />}
          label="Auto reconcile"
          value={
            account.autoReconciliationEnabled == null
              ? `User default ${refs.userAutoReconciliationEnabled ? "on" : "off"}`
              : account.autoReconciliationEnabled
                ? "Enabled"
                : "Disabled"
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">Institution</p>
          <p className="font-semibold text-slate-950 dark:text-white">{account.institutionName || "Not set"}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">Provider</p>
          <p className="font-semibold text-slate-950 dark:text-white">
            {account.provider === "manual" ? "Manual import stub" : account.provider}
          </p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">Currency</p>
          <p className="font-semibold text-slate-950 dark:text-white">{account.currency}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">Confidence threshold</p>
          <p className="font-semibold text-slate-950 dark:text-white">
            {account.autoReconciliationMinConfidence ?? refs.userAutoReconciliationMinConfidence}%
          </p>
        </Card>
      </div>

      {account.provider !== "manual" ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="space-y-2">
            <p className="text-sm text-slate-500 dark:text-slate-400">Connection status</p>
            <p className="font-semibold text-slate-950 dark:text-white">{account.connectionStatus}</p>
          </Card>
          <Card className="space-y-2">
            <p className="text-sm text-slate-500 dark:text-slate-400">Provider account ID</p>
            <p className="font-semibold text-slate-950 dark:text-white">{account.providerAccountId ?? "Not linked"}</p>
          </Card>
          <Card className="space-y-2">
            <p className="text-sm text-slate-500 dark:text-slate-400">Last sync</p>
            <p className="font-semibold text-slate-950 dark:text-white">{formatDateTime(account.lastSyncedAt)}</p>
          </Card>
          <Card className="space-y-2">
            <p className="text-sm text-slate-500 dark:text-slate-400">Last sync error</p>
            <p className="font-semibold text-slate-950 dark:text-white">{account.lastSyncError ?? "None"}</p>
          </Card>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {tabItems.map((item) => {
          const isActive = activeTab === item.value;

          return (
            <Link
              key={item.value}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
              }`}
              href={buildTabHref(account.id, item.value)}
            >
              {item.label} ({item.count})
            </Link>
          );
        })}
      </div>

      {transactions.length === 0 ? (
        <EmptyState
          title={`No ${activeTab} transactions`}
          description={
            activeTab === "review"
              ? "Import transactions manually to start reviewing and reconciling this account."
              : activeTab === "reconciled"
                ? "Reconciled transactions will appear here after you match them to income or expenses."
                : "Ignored transactions will appear here once you choose to ignore them."
          }
        />
      ) : (
        <DataTable
          headers={["Booked", "Description", "Counterparty", "Amount", "Match", "Actions"]}
          rows={transactions.map((transaction) => {
            const suggestion =
              transaction.suggestedRule && transaction.confidenceScore != null
                ? `${transaction.suggestedRule.name} (${transaction.confidenceScore}%)`
                : "No suggestion";
            const linked =
              transaction.reconciliationType === "INCOME"
                ? `Income · ${transaction.income?.category.name ?? "Linked"}`
                : transaction.reconciliationType === "EXPENSE"
                  ? `Expense · ${transaction.expense?.category.name ?? "Linked"}`
                  : suggestion;

            return [
              formatDate(transaction.bookedAt),
              transaction.description,
              transaction.counterparty || "Not set",
              formatCurrency(transaction.amount.abs(), currency),
              linked,
              <div className="flex flex-wrap gap-2" key={transaction.id}>
                <Button asChild size="sm" variant="secondary">
                  <Link href={`/reconcile/${account.id}/transactions/${transaction.id}`}>Open</Link>
                </Button>
                {activeTab === "review" && transaction.suggestedRuleId ? (
                  <form action={applySuggestedRuleAction}>
                    <input name="transactionId" type="hidden" value={transaction.id} />
                    <input name="redirectTo" type="hidden" value={buildTabHref(account.id, "review")} />
                    <Button type="submit" size="sm">Apply match</Button>
                  </form>
                ) : null}
                {activeTab === "review" ? (
                  <form action={ignoreTransactionAction}>
                    <input name="transactionId" type="hidden" value={transaction.id} />
                    <input name="redirectTo" type="hidden" value={buildTabHref(account.id, "review")} />
                    <Button type="submit" size="sm" variant="secondary">Ignore</Button>
                  </form>
                ) : null}
              </div>
            ];
          })}
        />
      )}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Manual import stub</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Use this to test imported transactions immediately while the live banking provider remains a stub.
            </p>
          </div>
          <ManualTransactionForm bankAccountId={account.id} currency={account.currency} />
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Memorised matches</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Rules can be account-specific or created automatically from a reconciliation.
            </p>
          </div>
          <RuleForm
            bankAccountId={account.id}
            categories={[
              ...refs.incomeCategories.map((category) => ({ id: category.id, name: category.name })),
              ...refs.expenseCategories.map((category) => ({ id: category.id, name: category.name }))
            ]}
            tenancies={refs.tenancies.map((tenancy) => ({
              id: tenancy.id,
              label: `${tenancy.property.name} · ${formatDate(tenancy.startDate)}`
            }))}
          />
        </div>
      </div>

      <Card className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Saved rules</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            High-confidence suggestions can be auto-applied when both the account or user setting allows it.
          </p>
        </div>
        {rules.length === 0 ? (
          <EmptyState
            title="No memorised matches yet"
            description="Save a rule from a reconciliation or create one here to speed up future matching."
          />
        ) : (
          <DataTable
            headers={["Rule", "Type", "Category", "Scope", "Updated", "Mode", "Actions"]}
            rows={rules.map((rule) => [
              rule.name,
              rule.type === "INCOME" ? "Income" : "Expense",
              rule.category.name,
              rule.tenancyAgreement?.property.name ?? "Reusable",
              formatDateTime(rule.updatedAt),
              rule.autoApply ? "Auto-apply enabled" : "Review before apply",
              <div className="flex flex-wrap gap-2" key={rule.id}>
                <Button asChild size="sm" variant="secondary">
                  <Link href={`/reconcile/${account.id}/rules/${rule.id}/edit`}>Edit</Link>
                </Button>
                <form action={deleteRuleAction}>
                  <input name="id" type="hidden" value={rule.id} />
                  <input name="redirectTo" type="hidden" value={buildTabHref(account.id, activeTab)} />
                  <Button type="submit" size="sm" variant="secondary">Delete</Button>
                </form>
              </div>
            ])}
          />
        )}
      </Card>
    </div>
  );
}
