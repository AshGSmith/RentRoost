import { NextResponse } from "next/server";

import { getTenantContext } from "@/lib/auth/tenant";
import { handleDomainRouteError, toJson } from "@/lib/domain/api";
import { deleteIncome, getIncomeEntry, updateIncome } from "@/lib/finance/service";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { tenantUserId }] = await Promise.all([params, getTenantContext()]);
  const income = await getIncomeEntry(tenantUserId, id);

  if (!income) {
    return NextResponse.json({ error: "Income entry not found." }, { status: 404 });
  }

  return toJson(income);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const [{ id }, context] = await Promise.all([params, getTenantContext()]);

  try {
    const income = await updateIncome(id, await request.json(), {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });

    return toJson(income);
  } catch (error) {
    return handleDomainRouteError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const [{ id }, context] = await Promise.all([params, getTenantContext()]);

  try {
    await deleteIncome(id, {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleDomainRouteError(error);
  }
}
