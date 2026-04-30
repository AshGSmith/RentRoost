import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getTenantContext } from "@/lib/auth/tenant";
import { getDocumentForUser } from "@/lib/documents/service";
import { formatDate } from "@/lib/domain/utils";

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { tenantUserId }] = await Promise.all([params, getTenantContext()]);
  const document = await getDocumentForUser(tenantUserId, id);

  if (!document) notFound();

  return (
    <div className="space-y-8">
      <PageHeader
        description={document.fileName}
        title={document.name}
        actions={
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="secondary">
              <Link href={`/api/documents/${document.id}`}>View file</Link>
            </Button>
            <Button asChild>
              <Link href={`/api/documents/${document.id}?download=1`}>Download</Link>
            </Button>
            {document.category === "GENERATED_TEMPLATE" ? (
              <Button asChild variant="secondary">
                <Link href={`/api/documents/${document.id}?format=doc&download=1`}>Download DOC-like</Link>
              </Button>
            ) : null}
          </div>
        }
      />
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="space-y-2"><p className="text-sm text-slate-500 dark:text-slate-400">Category</p><p className="font-semibold text-slate-950 dark:text-white">{document.category}</p></Card>
        <Card className="space-y-2"><p className="text-sm text-slate-500 dark:text-slate-400">Linked tenancy</p><p className="font-semibold text-slate-950 dark:text-white">{document.tenancyAgreement?.property.name ?? "None"}</p></Card>
        <Card className="space-y-2"><p className="text-sm text-slate-500 dark:text-slate-400">Linked property</p><p className="font-semibold text-slate-950 dark:text-white">{document.property?.name ?? "None"}</p></Card>
        <Card className="space-y-2"><p className="text-sm text-slate-500 dark:text-slate-400">Uploaded</p><p className="font-semibold text-slate-950 dark:text-white">{formatDate(document.createdAt)}</p></Card>
      </div>
    </div>
  );
}
