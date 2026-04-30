import { getTenantContext } from "@/lib/auth/tenant";
import { toJson, handleDomainRouteError } from "@/lib/domain/api";
import { listTenanciesForUser } from "@/lib/domain/queries";
import { createTenancy } from "@/lib/domain/services";

export async function GET() {
  const { tenantUserId } = await getTenantContext();
  const tenancies = await listTenanciesForUser(tenantUserId);

  return toJson(tenancies);
}

export async function POST(request: Request) {
  const context = await getTenantContext();
  const payload = await request.json();

  try {
    const tenancy = await createTenancy(
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

    return toJson(tenancy, 201);
  } catch (error) {
    return handleDomainRouteError(error);
  }
}
