import { IncomeForm } from "@/components/finance/income-form";
import { PageHeader } from "@/components/ui/page-header";
import { getTenantContext } from "@/lib/auth/tenant";
import { getCashflowReferenceData } from "@/lib/finance/service";

export default async function NewIncomePage() {
  const { tenantUserId } = await getTenantContext();
  const refs = await getCashflowReferenceData(tenantUserId);

  return (
    <div className="space-y-8">
      <PageHeader title="New income" description="Log rent and other incoming receipts." />
      <IncomeForm
        categories={refs.incomeCategories.map((category) => ({ id: category.id, name: category.name }))}
        tenancies={refs.tenancies.map((tenancy) => ({
          id: tenancy.id,
          label: `${tenancy.property.name} · ${tenancy.startDate.toISOString().slice(0, 10)}`
        }))}
      />
    </div>
  );
}
