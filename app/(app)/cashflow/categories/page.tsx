import Link from "next/link";

import { deleteCategoryAction } from "@/app/(app)/cashflow/actions";
import { CategoryForm } from "@/components/finance/category-form";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { getTenantContext } from "@/lib/auth/tenant";
import { listCashflowCategories } from "@/lib/finance/service";

export default async function CashflowCategoriesPage({
  searchParams
}: {
  searchParams: Promise<{ type?: "INCOME" | "EXPENSE"; error?: string }>;
}) {
  const [{ type, error }, { tenantUserId }] = await Promise.all([searchParams, getTenantContext()]);
  const activeType = type === "EXPENSE" ? "EXPENSE" : "INCOME";
  const categories = await listCashflowCategories(tenantUserId, activeType);

  return (
    <div className="space-y-8">
      <PageHeader title="Cashflow categories" description="Manage your income and expense categories." />
      {error ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
      <div className="flex gap-3">
        <Button asChild variant={activeType === "INCOME" ? "primary" : "secondary"}>
          <Link href="/cashflow/categories?type=INCOME">Income categories</Link>
        </Button>
        <Button asChild variant={activeType === "EXPENSE" ? "primary" : "secondary"}>
          <Link href="/cashflow/categories?type=EXPENSE">Expense categories</Link>
        </Button>
      </div>
      <CategoryForm type={activeType} />
      <DataTable
        headers={["Category", "Default", "Actions"]}
        rows={categories.map((category) => [
          category.name,
          category.isDefault ? "Default" : "Custom",
          category.isDefault ? (
            "Protected"
          ) : (
            <form action={deleteCategoryAction} key={category.id}>
              <input name="id" type="hidden" value={category.id} />
              <input name="type" type="hidden" value={activeType} />
              <Button size="sm" type="submit" variant="danger">Delete</Button>
            </form>
          )
        ])}
      />
    </div>
  );
}
