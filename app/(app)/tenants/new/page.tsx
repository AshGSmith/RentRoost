import { DomainNav } from "@/components/domain/domain-nav";
import { TenantForm } from "@/components/domain/tenant-form";
import { PageHeader } from "@/components/ui/page-header";

export default function NewTenantPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="New tenant" description="Add a tenant contact ready to attach to tenancy agreements." />
      <DomainNav activeHref="/tenants" />
      <TenantForm />
    </div>
  );
}
