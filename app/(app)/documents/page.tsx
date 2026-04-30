import Link from "next/link";

import { DocumentUploadForm } from "@/components/documents/document-upload-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getTenantContext } from "@/lib/auth/tenant";
import { getDocumentReferences, listDocumentsForUser } from "@/lib/documents/service";
import { formatDate } from "@/lib/domain/utils";

export default async function DocumentsPage() {
  const { tenantUserId } = await getTenantContext();
  const [documents, refs] = await Promise.all([
    listDocumentsForUser(tenantUserId),
    getDocumentReferences(tenantUserId)
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        description="Upload and manage tenancy, property, organisation, and generated template documents."
        title="Documents"
      />

      <Card className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Upload document</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Documents are stored in the database and always linked to your account.
          </p>
        </div>
        <DocumentUploadForm
          properties={refs.properties.map((property) => ({ id: property.id, name: property.name }))}
          tenancies={refs.tenancies.map((tenancy) => ({
            id: tenancy.id,
            label: `${tenancy.property.name} · ${tenancy.startDate.toISOString().slice(0, 10)}`
          }))}
        />
      </Card>

      {documents.length === 0 ? (
        <EmptyState
          title="No documents uploaded yet"
          description="Upload tenancy files, organisation documents, or generate letters from templates to see them here."
        />
      ) : (
        <DataTable
          headers={["Name", "Category", "Linked to", "Added", "Open"]}
          rows={documents.map((document) => [
            document.name,
            document.category === "GENERATED_TEMPLATE"
              ? "Generated template"
              : document.category === "TENANCY_AGREEMENT"
                ? "Tenancy agreement"
                : "General",
            document.tenancyAgreement?.property.name ??
              document.property?.name ??
              (document.organisationDocument ? "Organisation" : "Unlinked"),
            formatDate(document.createdAt),
            <Button asChild key={document.id} size="sm" variant="secondary">
              <Link href={`/documents/${document.id}`}>View</Link>
            </Button>
          ])}
        />
      )}
    </div>
  );
}
