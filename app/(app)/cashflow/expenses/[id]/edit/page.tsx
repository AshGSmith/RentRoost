import { notFound } from "next/navigation";

import { ExpenseForm } from "@/components/finance/expense-form";
import { PageHeader } from "@/components/ui/page-header";
import { getTenantContext } from "@/lib/auth/tenant";
import { getCashflowReferenceData, getExpenseEntry } from "@/lib/finance/service";

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { tenantUserId }] = await Promise.all([params, getTenantContext()]);
  const [entry, refs] = await Promise.all([getExpenseEntry(tenantUserId, id), getCashflowReferenceData(tenantUserId)]);

  if (!entry) notFound();

  return (
    <div className="space-y-8">
      <PageHeader title="Edit expense" description="Update a logged expense." />
      <ExpenseForm
        expense={{
          id: entry.id,
          categoryId: entry.categoryId,
          tenancyAgreementId: entry.tenancyAgreementId,
          grossAmount: entry.grossAmount.toString(),
          removeVat: entry.removeVat,
          description: entry.description,
          invoiceNumber: entry.invoiceNumber,
          dueDate: entry.dueDate.toISOString().slice(0, 10),
          supplier: entry.supplier,
          paid: entry.paid,
          organisationExpense: entry.organisationExpense
        }}
        categories={refs.expenseCategories.map((category) => ({ id: category.id, name: category.name }))}
        tenancies={refs.tenancies.map((tenancy) => ({
          id: tenancy.id,
          label: `${tenancy.property.name} · ${tenancy.startDate.toISOString().slice(0, 10)}`
        }))}
        today={new Date().toISOString().slice(0, 10)}
      />
    </div>
  );
}
