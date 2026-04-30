import { NextResponse } from "next/server";

import { getTenantContext } from "@/lib/auth/tenant";
import { toJson, handleDomainRouteError } from "@/lib/domain/api";
import { getTenancyForUser } from "@/lib/domain/queries";
import { deleteTenancy, updateTenancy } from "@/lib/domain/services";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { tenantUserId }] = await Promise.all([params, getTenantContext()]);
  const tenancy = await getTenancyForUser(tenantUserId, id);

  if (!tenancy) {
    return NextResponse.json({ error: "Tenancy not found." }, { status: 404 });
  }

  return toJson(tenancy);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const [{ id }, context] = await Promise.all([params, getTenantContext()]);
  const payload = await request.json();

  try {
    const tenancy = await updateTenancy(
      id,
      payload,
      payload.agreementDocumentBase64
        ? {
            fileName: payload.agreementDocumentName ?? "agreement",
            mimeType: payload.agreementDocumentMimeType ?? "application/octet-stream",
            fileSize: Buffer.from(payload.agreementDocumentBase64, "base64").length,
            fileData: Buffer.from(payload.agreementDocumentBase64, "base64")
          }
        : null,
      {
        tenantUserId: context.tenantUserId,
        actorUserId: context.user.id
      }
    );

    return toJson(tenancy);
  } catch (error) {
    return handleDomainRouteError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const [{ id }, context] = await Promise.all([params, getTenantContext()]);

  try {
    await deleteTenancy(id, {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleDomainRouteError(error);
  }
}
