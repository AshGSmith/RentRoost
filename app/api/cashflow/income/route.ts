import { getTenantContext } from "@/lib/auth/tenant";
import { handleDomainRouteError, toJson } from "@/lib/domain/api";
import { createIncome, listIncomeEntries } from "@/lib/finance/service";

export async function GET() {
  const { tenantUserId } = await getTenantContext();
  return toJson(await listIncomeEntries(tenantUserId));
}

export async function POST(request: Request) {
  const context = await getTenantContext();

  try {
    const income = await createIncome(await request.json(), {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });

    return toJson(income, 201);
  } catch (error) {
    return handleDomainRouteError(error);
  }
}
