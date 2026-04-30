import { ExpenseForm } from "@/components/finance/expense-form";
import { PageHeader } from "@/components/ui/page-header";
import { getTenantContext } from "@/lib/auth/tenant";
import { getCashflowReferenceData } from "@/lib/finance/service";

export default async function NewExpensePage() {
  const { tenantUserId } = await getTenantContext();
  const refs = await getCashflowReferenceData(tenantUserId);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-8">
      <PageHeader title="New expense" description="Log supplier costs, tax, insurance and organisation expenses." />
      <ExpenseForm
        categories={refs.expenseCategories.map((category) => ({ id: category.id, name: category.name }))}
        tenancies={refs.tenancies.map((tenancy) => ({
          id: tenancy.id,
          label: `${tenancy.property.name} · ${tenancy.startDate.toISOString().slice(0, 10)}`
        }))}
        today={today}
      />
    </div>
  );
}
