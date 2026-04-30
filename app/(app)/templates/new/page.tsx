import { TemplateForm } from "@/components/templates/template-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { TEMPLATE_MERGE_FIELDS } from "@/lib/templates/defaults";

export default function NewTemplatePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        description="Keep the editor lightweight by using merge-field tokens inside a plain template body."
        title="New template"
      />
      <Card>
        <TemplateForm mergeFields={[...TEMPLATE_MERGE_FIELDS]} />
      </Card>
    </div>
  );
}
