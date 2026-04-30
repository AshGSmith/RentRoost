import { getTenantContext } from "@/lib/auth/tenant";
import { toJson, handleDomainRouteError } from "@/lib/domain/api";
import { listPropertiesForUser } from "@/lib/domain/queries";
import { createProperty } from "@/lib/domain/services";

export async function GET() {
  const { tenantUserId } = await getTenantContext();
  const properties = await listPropertiesForUser(tenantUserId);

  return toJson(properties);
}

export async function POST(request: Request) {
  const context = await getTenantContext();

  try {
    const property = await createProperty(await request.json(), {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });

    return toJson(property, 201);
  } catch (error) {
    return handleDomainRouteError(error);
  }
}
