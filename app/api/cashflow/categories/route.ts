import { getTenantContext } from "@/lib/auth/tenant";
import { handleDomainRouteError, toJson } from "@/lib/domain/api";
import { createCashflowCategory, listCashflowCategories } from "@/lib/finance/service";

export async function GET(request: Request) {
  const { tenantUserId } = await getTenantContext();
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const categories = await listCashflowCategories(
    tenantUserId,
    type === "INCOME" || type === "EXPENSE" ? type : undefined
  );

  return toJson(categories);
}

export async function POST(request: Request) {
  const context = await getTenantContext();

  try {
    const category = await createCashflowCategory(await request.json(), {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });

    return toJson(category, 201);
  } catch (error) {
    return handleDomainRouteError(error);
  }
}
