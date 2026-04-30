import { notFound } from "next/navigation";

import { RuleForm } from "@/components/reconcile/rule-form";
import { PageHeader } from "@/components/ui/page-header";
import { getTenantContext } from "@/lib/auth/tenant";
import {
  getReconcileReferenceData,
  getReconciliationRule
} from "@/lib/reconcile/service";

export default async function EditReconciliationRulePage({
  params
}: {
  params: Promise<{ id: string; ruleId: string }>;
}) {
  const [{ id, ruleId }, { tenantUserId }] = await Promise.all([params, getTenantContext()]);
  const [rule, refs] = await Promise.all([
    getReconciliationRule(tenantUserId, ruleId),
    getReconcileReferenceData(tenantUserId)
  ]);

  if (!rule || rule.bankAccountId !== id) notFound();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Edit memorised match"
        description="Refine the pattern, linked category, and auto-apply behaviour for this bank account."
      />
      <RuleForm
        bankAccountId={id}
        categories={[
          ...refs.incomeCategories.map((category) => ({ id: category.id, name: category.name })),
          ...refs.expenseCategories.map((category) => ({ id: category.id, name: category.name }))
        ]}
        rule={{
          id: rule.id,
          name: rule.name,
          type: rule.type,
          normalizedDescription: rule.normalizedDescription,
          amount: rule.amount?.toString() ?? "",
          counterparty: rule.counterparty,
          categoryId: rule.categoryId,
          tenancyAgreementId: rule.tenancyAgreementId,
          organisationExpense: rule.organisationExpense,
          supplier: rule.supplier,
          expenseDescription: rule.expenseDescription,
          incomeNotes: rule.incomeNotes,
          removeVat: rule.removeVat,
          paid: rule.paid,
          enabled: rule.enabled,
          autoApply: rule.autoApply
        }}
        tenancies={refs.tenancies.map((tenancy) => ({
          id: tenancy.id,
          label: `${tenancy.property.name} · ${tenancy.startDate.toISOString().slice(0, 10)}`
        }))}
      />
    </div>
  );
}
