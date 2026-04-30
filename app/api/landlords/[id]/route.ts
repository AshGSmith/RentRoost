import { NextResponse } from "next/server";

import { getTenantContext } from "@/lib/auth/tenant";
import { toJson, handleDomainRouteError } from "@/lib/domain/api";
import { getLandlordForUser } from "@/lib/domain/queries";
import { deleteLandlord, updateLandlord } from "@/lib/domain/services";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { tenantUserId }] = await Promise.all([params, getTenantContext()]);
  const landlord = await getLandlordForUser(tenantUserId, id);

  if (!landlord) {
    return NextResponse.json({ error: "Landlord not found." }, { status: 404 });
  }

  return toJson(landlord);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const [{ id }, context] = await Promise.all([params, getTenantContext()]);

  try {
    const landlord = await updateLandlord(id, await request.json(), {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });

    return toJson(landlord);
  } catch (error) {
    return handleDomainRouteError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const [{ id }, context] = await Promise.all([params, getTenantContext()]);

  try {
    await deleteLandlord(id, {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleDomainRouteError(error);
  }
}
