import Link from "next/link";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getTenantContext } from "@/lib/auth/tenant";
import { listTemplatesForUser } from "@/lib/documents/service";
import { TEMPLATE_MERGE_FIELDS } from "@/lib/templates/defaults";

export default async function TemplatesPage() {
  const { tenantUserId } = await getTenantContext();
  const templates = await listTemplatesForUser(tenantUserId);

  return (
    <div className="space-y-8">
      <PageHeader
        description="Manage reusable blue-branded document templates with merge fields and PDF generation."
        title="Templates"
        actions={
          <Button asChild>
            <Link href="/templates/new">New template</Link>
          </Button>
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        Supported merge fields: {TEMPLATE_MERGE_FIELDS.map((field) => `{{${field.key}}}`).join(", ")}
      </div>

      {templates.length === 0 ? (
        <EmptyState
          title="No templates yet"
          description="Create a template or rely on the default welcome and rent increase letters."
        />
      ) : (
        <DataTable
          headers={["Template", "Kind", "Default", "Open"]}
          rows={templates.map((template) => [
            template.name,
            template.kind,
            template.isDefault ? "Yes" : "No",
            <Button asChild key={template.id} size="sm" variant="secondary">
              <Link href={`/templates/${template.id}`}>Open</Link>
            </Button>
          ])}
        />
      )}
    </div>
  );
}
