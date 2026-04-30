import { notFound } from "next/navigation";

import { BankAccountForm } from "@/components/reconcile/bank-account-form";
import { PageHeader } from "@/components/ui/page-header";
import { getTenantContext } from "@/lib/auth/tenant";
import { getBankAccount } from "@/lib/reconcile/service";

export default async function EditBankAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { tenantUserId }] = await Promise.all([params, getTenantContext()]);
  const account = await getBankAccount(tenantUserId, id);

  if (!account) notFound();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Edit bank account"
        description="Update provider metadata and account-level auto reconciliation overrides."
      />
      <BankAccountForm account={account} />
    </div>
  );
}
