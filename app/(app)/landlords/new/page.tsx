import { DomainNav } from "@/components/domain/domain-nav";
import { LandlordForm } from "@/components/domain/landlord-form";
import { PageHeader } from "@/components/ui/page-header";

export default function NewLandlordPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="New landlord"
        description="Create a landlord record for contact management and future reporting."
      />
      <DomainNav activeHref="/landlords" />
      <LandlordForm />
    </div>
  );
}
