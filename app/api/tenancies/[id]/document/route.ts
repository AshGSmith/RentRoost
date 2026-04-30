import { NextResponse } from "next/server";
import { DocumentCategory } from "@prisma/client";

import { getTenantContext } from "@/lib/auth/tenant";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { tenantUserId }] = await Promise.all([params, getTenantContext()]);
  const document = await prisma.documentRecord.findFirst({
    where: {
      tenancyAgreementId: id,
      userId: tenantUserId,
      category: DocumentCategory.TENANCY_AGREEMENT
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  if (!document) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(Buffer.from(document.fileData), {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Disposition": `attachment; filename="${document.fileName}"`,
      "Cache-Control": "private, max-age=60"
    }
  });
}
