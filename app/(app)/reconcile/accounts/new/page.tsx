import { BankAccountForm } from "@/components/reconcile/bank-account-form";
import { PageHeader } from "@/components/ui/page-header";

export default function NewBankAccountPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Add bank account"
        description="Create a database-backed account record and choose whether it should use manual import or future live feeds."
      />
      <BankAccountForm />
    </div>
  );
}
