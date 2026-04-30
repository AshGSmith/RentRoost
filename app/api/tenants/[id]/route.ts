import { NextResponse } from "next/server";

import { getTenantContext } from "@/lib/auth/tenant";
import { toJson, handleDomainRouteError } from "@/lib/domain/api";
import { getTenantForUser } from "@/lib/domain/queries";
import { deleteTenant, updateTenant } from "@/lib/domain/services";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { tenantUserId }] = await Promise.all([params, getTenantContext()]);
  const tenant = await getTenantForUser(tenantUserId, id);

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
  }

  return toJson(tenant);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const [{ id }, context] = await Promise.all([params, getTenantContext()]);

  try {
    const tenant = await updateTenant(id, await request.json(), {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });

    return toJson(tenant);
  } catch (error) {
    return handleDomainRouteError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const [{ id }, context] = await Promise.all([params, getTenantContext()]);

  try {
    await deleteTenant(id, {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleDomainRouteError(error);
  }
}
