import { getTenantContext } from "@/lib/auth/tenant";
import { handleDomainRouteError, toJson } from "@/lib/domain/api";
import { createExpense, listExpenseEntries } from "@/lib/finance/service";

export async function GET() {
  const { tenantUserId } = await getTenantContext();
  return toJson(await listExpenseEntries(tenantUserId));
}

export async function POST(request: Request) {
  const context = await getTenantContext();

  try {
    const expense = await createExpense(await request.json(), {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });

    return toJson(expense, 201);
  } catch (error) {
    return handleDomainRouteError(error);
  }
}
