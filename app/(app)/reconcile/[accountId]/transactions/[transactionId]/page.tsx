import Link from "next/link";
import { notFound } from "next/navigation";

import { applySuggestedRuleAction, ignoreTransactionAction } from "@/app/(app)/reconcile/actions";
import { ReconcileExpenseForm } from "@/components/reconcile/reconcile-expense-form";
import { ReconcileIncomeForm } from "@/components/reconcile/reconcile-income-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getTenantContext, getTenantSettings } from "@/lib/auth/tenant";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/domain/utils";
import { getBankTransaction, getReconcileReferenceData } from "@/lib/reconcile/service";

export default async function BankTransactionDetailPage({
  params
}: {
  params: Promise<{ accountId: string; transactionId: string }>;
}) {
  const [{ accountId, transactionId }, { tenantUserId }, { settings }] = await Promise.all([
    params,
    getTenantContext(),
    getTenantSettings()
  ]);

  const [transaction, refs] = await Promise.all([
    getBankTransaction(tenantUserId, transactionId),
    getReconcileReferenceData(tenantUserId)
  ]);

  if (!transaction || transaction.bankAccountId !== accountId) notFound();

  const currency = settings?.currencyDesignator ?? "£";
  const redirectTo = `/reconcile/${accountId}?tab=review`;
  const confidenceThreshold =
    transaction.bankAccount.autoReconciliationMinConfidence ??
    refs.userAutoReconciliationMinConfidence;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Transaction review"
        description={transaction.description}
        actions={
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="secondary">
              <Link href={`/reconcile/${accountId}`}>Back to account</Link>
            </Button>
            {transaction.status === "REVIEW" ? (
              <form action={ignoreTransactionAction}>
                <input name="transactionId" type="hidden" value={transaction.id} />
                <input name="redirectTo" type="hidden" value={redirectTo} />
                <Button type="submit" variant="secondary">Ignore transaction</Button>
              </form>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">Booked date</p>
          <p className="font-semibold text-slate-950 dark:text-white">{formatDate(transaction.bookedAt)}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">Amount</p>
          <p className="font-semibold text-slate-950 dark:text-white">
            {formatCurrency(transaction.amount.abs(), currency)}
          </p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">Status</p>
          <p className="font-semibold text-slate-950 dark:text-white">{transaction.status}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">Confidence</p>
          <p className="font-semibold text-slate-950 dark:text-white">
            {transaction.confidenceScore != null ? `${transaction.confidenceScore}%` : "No suggestion"}
          </p>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">Counterparty</p>
          <p className="font-semibold text-slate-950 dark:text-white">{transaction.counterparty || "Not set"}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">Reference</p>
          <p className="font-semibold text-slate-950 dark:text-white">{transaction.reference || "Not set"}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">Imported at</p>
          <p className="font-semibold text-slate-950 dark:text-white">{formatDateTime(transaction.createdAt)}</p>
        </Card>
      </div>

      {transaction.suggestedRule ? (
        <Card className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Suggested match</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {transaction.confidenceScore != null && transaction.confidenceScore < confidenceThreshold
                ? `Confidence is below the ${confidenceThreshold}% auto-apply threshold, so this match needs review before saving.`
                : "This suggestion is ready to apply immediately if it looks correct."}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="space-y-2">
              <p className="text-sm text-slate-500 dark:text-slate-400">Rule</p>
              <p className="font-semibold text-slate-950 dark:text-white">{transaction.suggestedRule.name}</p>
            </Card>
            <Card className="space-y-2">
              <p className="text-sm text-slate-500 dark:text-slate-400">Type</p>
              <p className="font-semibold text-slate-950 dark:text-white">{transaction.suggestedRule.type}</p>
            </Card>
            <Card className="space-y-2">
              <p className="text-sm text-slate-500 dark:text-slate-400">Category</p>
              <p className="font-semibold text-slate-950 dark:text-white">{transaction.suggestedRule.category.name}</p>
            </Card>
            <Card className="space-y-2">
              <p className="text-sm text-slate-500 dark:text-slate-400">Tenancy</p>
              <p className="font-semibold text-slate-950 dark:text-white">
                {transaction.suggestedRule.tenancyAgreement?.property.name ?? "Not linked"}
              </p>
            </Card>
          </div>
          {transaction.status === "REVIEW" ? (
            <form action={applySuggestedRuleAction}>
              <input name="transactionId" type="hidden" value={transaction.id} />
              <input name="redirectTo" type="hidden" value={redirectTo} />
              <Button type="submit">Apply suggested match</Button>
            </form>
          ) : null}
        </Card>
      ) : null}

      {transaction.status === "REVIEW" ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Reconcile as income</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Use this for rent receipts, deposits, rebates, or any other incoming funds.
              </p>
            </div>
            <ReconcileIncomeForm
              amount={transaction.amount.abs().toString()}
              categories={refs.incomeCategories.map((category) => ({ id: category.id, name: category.name }))}
              paymentDate={transaction.bookedAt.toISOString().slice(0, 10)}
              redirectTo={redirectTo}
              tenancies={refs.tenancies.map((tenancy) => ({
                id: tenancy.id,
                label: `${tenancy.property.name} · ${formatDate(tenancy.startDate)}`
              }))}
              transactionId={transaction.id}
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Reconcile as expense</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Use this for supplier bills, compliance spend, repairs, and organisation expenses.
              </p>
            </div>
            <ReconcileExpenseForm
              amount={transaction.amount.abs().toString()}
              categories={refs.expenseCategories.map((category) => ({ id: category.id, name: category.name }))}
              defaultDescription={transaction.description}
              defaultSupplier={transaction.counterparty || "Imported counterparty"}
              dueDate={transaction.bookedAt.toISOString().slice(0, 10)}
              redirectTo={redirectTo}
              tenancies={refs.tenancies.map((tenancy) => ({
                id: tenancy.id,
                label: `${tenancy.property.name} · ${formatDate(tenancy.startDate)}`
              }))}
              transactionId={transaction.id}
            />
          </div>
        </div>
      ) : null}

      {transaction.status === "RECONCILED" ? (
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Reconciled entry</h2>
          {transaction.reconciliationType === "INCOME" && transaction.income ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Linked to income in {transaction.income.category.name}
                {transaction.income.tenancyAgreement?.property.name
                  ? ` for ${transaction.income.tenancyAgreement.property.name}`
                  : ""}.
              </p>
              <Button asChild variant="secondary">
                <Link href={`/cashflow/income/${transaction.income.id}`}>Open income</Link>
              </Button>
            </div>
          ) : null}
          {transaction.reconciliationType === "EXPENSE" && transaction.expense ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Linked to expense in {transaction.expense.category.name}
                {transaction.expense.tenancyAgreement?.property.name
                  ? ` for ${transaction.expense.tenancyAgreement.property.name}`
                  : transaction.expense.organisationExpense
                    ? " as an organisation expense"
                    : ""}.
              </p>
              <Button asChild variant="secondary">
                <Link href={`/cashflow/expenses/${transaction.expense.id}`}>Open expense</Link>
              </Button>
            </div>
          ) : null}
        </Card>
      ) : null}

      {transaction.status === "IGNORED" ? (
        <Card className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Ignored transaction</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            This transaction was moved out of Review and is kept in the ignored ledger for traceability.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
