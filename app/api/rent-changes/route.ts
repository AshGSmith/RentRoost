import { getTenantContext } from "@/lib/auth/tenant";
import { toJson, handleDomainRouteError } from "@/lib/domain/api";
import { prisma } from "@/lib/prisma";
import { createRentChange } from "@/lib/domain/services";

export async function GET() {
  const { tenantUserId } = await getTenantContext();
  const rentChanges = await prisma.rentChange.findMany({
    where: { userId: tenantUserId },
    orderBy: [{ effectiveDate: "desc" }, { createdAt: "desc" }]
  });

  return toJson(rentChanges);
}

export async function POST(request: Request) {
  const context = await getTenantContext();

  try {
    const rentChange = await createRentChange(await request.json(), {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });

    return toJson(rentChange, 201);
  } catch (error) {
    return handleDomainRouteError(error);
  }
}
