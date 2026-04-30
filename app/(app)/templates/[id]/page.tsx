import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteTemplateAction } from "@/app/(app)/templates/actions";
import { TemplateGenerateForm } from "@/components/templates/template-generate-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getTenantContext, getTenantSettings } from "@/lib/auth/tenant";
import {
  buildTemplatePreviewData,
  getDocumentReferences,
  getTemplateForUser
} from "@/lib/documents/service";
import { TEMPLATE_MERGE_FIELDS } from "@/lib/templates/defaults";

export default async function TemplateDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tenancyAgreementId?: string; propertyId?: string }>;
}) {
  const [{ id }, search, { tenantUserId }, { settings }] = await Promise.all([
    params,
    searchParams,
    getTenantContext(),
    getTenantSettings()
  ]);

  const template = await getTemplateForUser(tenantUserId, id);
  if (!template) notFound();

  const refs = await getDocumentReferences(tenantUserId);
  const preview = await buildTemplatePreviewData(
    id,
    {
      tenancyAgreementId: search.tenancyAgreementId ?? refs.tenancies[0]?.id,
      propertyId: search.propertyId ?? ""
    },
    tenantUserId,
    settings?.currencyDesignator ?? "£"
  );

  return (
    <div className="space-y-8">
      <PageHeader
        description={template.kind}
        title={template.name}
        actions={
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="secondary">
              <Link href={`/templates/${template.id}/edit`}>Edit</Link>
            </Button>
            <form action={deleteTemplateAction}>
              <input name="id" type="hidden" value={template.id} />
              <Button type="submit" variant="danger">Delete</Button>
            </form>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Generate document</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Choose tenancy and property context, then save a branded PDF into Documents.
            </p>
          </div>
          <TemplateGenerateForm
            properties={refs.properties.map((property) => ({ id: property.id, name: property.name }))}
            templateId={template.id}
            tenancies={refs.tenancies.map((tenancy) => ({
              id: tenancy.id,
              label: `${tenancy.property.name} · ${tenancy.startDate.toISOString().slice(0, 10)}`
            }))}
          />
          <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
            <p className="font-medium text-slate-900 dark:text-slate-100">Merge field tokens</p>
            <p>{TEMPLATE_MERGE_FIELDS.map((field) => `{{${field.key}}}`).join(", ")}</p>
          </div>
        </Card>

        <Card className="space-y-5">
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900/60 dark:bg-blue-950/20">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
              {preview.organisation?.organisationName ?? "Organisation"}
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">{template.name}</h2>
          </div>
          <div className="space-y-4 text-sm leading-7 text-slate-700 dark:text-slate-300">
            {preview.renderedText.split(/\n{2,}/).filter(Boolean).map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
