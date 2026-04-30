import { notFound } from "next/navigation";

import { IncomeForm } from "@/components/finance/income-form";
import { PageHeader } from "@/components/ui/page-header";
import { getTenantContext } from "@/lib/auth/tenant";
import { getCashflowReferenceData, getIncomeEntry } from "@/lib/finance/service";

export default async function EditIncomePage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { tenantUserId }] = await Promise.all([params, getTenantContext()]);
  const [entry, refs] = await Promise.all([getIncomeEntry(tenantUserId, id), getCashflowReferenceData(tenantUserId)]);

  if (!entry) notFound();

  return (
    <div className="space-y-8">
      <PageHeader title="Edit income" description="Update an income receipt." />
      <IncomeForm
        income={{
          id: entry.id,
          categoryId: entry.categoryId,
          tenancyAgreementId: entry.tenancyAgreementId,
          amount: entry.amount.toString(),
          paymentDate: entry.paymentDate.toISOString().slice(0, 10),
          notes: entry.notes
        }}
        categories={refs.incomeCategories.map((category) => ({ id: category.id, name: category.name }))}
        tenancies={refs.tenancies.map((tenancy) => ({
          id: tenancy.id,
          label: `${tenancy.property.name} · ${tenancy.startDate.toISOString().slice(0, 10)}`
        }))}
      />
    </div>
  );
}
