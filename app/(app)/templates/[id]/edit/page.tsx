import { notFound } from "next/navigation";

import { TemplateForm } from "@/components/templates/template-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getTenantContext } from "@/lib/auth/tenant";
import { getTemplateForUser } from "@/lib/documents/service";
import { TEMPLATE_MERGE_FIELDS } from "@/lib/templates/defaults";

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { tenantUserId }] = await Promise.all([params, getTenantContext()]);
  const template = await getTemplateForUser(tenantUserId, id);

  if (!template) notFound();

  return (
    <div className="space-y-8">
      <PageHeader
        description="Update the template body and keep using merge-field tokens for generated letters."
        title="Edit template"
      />
      <Card>
        <TemplateForm
          mergeFields={[...TEMPLATE_MERGE_FIELDS]}
          template={{
            id: template.id,
            name: template.name,
            content: template.content
          }}
        />
      </Card>
    </div>
  );
}
