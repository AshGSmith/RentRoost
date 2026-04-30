import { getTenantContext } from "@/lib/auth/tenant";
import { toJson, handleDomainRouteError } from "@/lib/domain/api";
import { listLandlordsForUser } from "@/lib/domain/queries";
import { createLandlord } from "@/lib/domain/services";

export async function GET() {
  const { tenantUserId } = await getTenantContext();
  const landlords = await listLandlordsForUser(tenantUserId);

  return toJson(landlords);
}

export async function POST(request: Request) {
  const context = await getTenantContext();

  try {
    const landlord = await createLandlord(await request.json(), {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });

    return toJson(landlord, 201);
  } catch (error) {
    return handleDomainRouteError(error);
  }
}
