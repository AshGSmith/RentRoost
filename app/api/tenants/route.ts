import { getTenantContext } from "@/lib/auth/tenant";
import { toJson, handleDomainRouteError } from "@/lib/domain/api";
import { listTenantsForUser } from "@/lib/domain/queries";
import { createTenant } from "@/lib/domain/services";

export async function GET() {
  const { tenantUserId } = await getTenantContext();
  const tenants = await listTenantsForUser(tenantUserId);

  return toJson(tenants);
}

export async function POST(request: Request) {
  const context = await getTenantContext();

  try {
    const tenant = await createTenant(await request.json(), {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });

    return toJson(tenant, 201);
  } catch (error) {
    return handleDomainRouteError(error);
  }
}
