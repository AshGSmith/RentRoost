import { NextResponse } from "next/server";

import { getTenantContext } from "@/lib/auth/tenant";
import { handleDomainRouteError, toJson } from "@/lib/domain/api";
import { deleteExpense, getExpenseEntry, updateExpense } from "@/lib/finance/service";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { tenantUserId }] = await Promise.all([params, getTenantContext()]);
  const expense = await getExpenseEntry(tenantUserId, id);

  if (!expense) {
    return NextResponse.json({ error: "Expense entry not found." }, { status: 404 });
  }

  return toJson(expense);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const [{ id }, context] = await Promise.all([params, getTenantContext()]);

  try {
    const expense = await updateExpense(id, await request.json(), {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });

    return toJson(expense);
  } catch (error) {
    return handleDomainRouteError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const [{ id }, context] = await Promise.all([params, getTenantContext()]);

  try {
    await deleteExpense(id, {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleDomainRouteError(error);
  }
}
