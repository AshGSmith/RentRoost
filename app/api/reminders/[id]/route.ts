import { NextResponse } from "next/server";

import { getTenantContext } from "@/lib/auth/tenant";
import { handleDomainRouteError, toJson } from "@/lib/domain/api";
import { getReminderForUser } from "@/lib/domain/queries";
import { deleteReminder, updateReminder } from "@/lib/domain/services";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { tenantUserId }] = await Promise.all([params, getTenantContext()]);
  const reminder = await getReminderForUser(tenantUserId, id);

  if (!reminder) {
    return NextResponse.json({ error: "Reminder not found." }, { status: 404 });
  }

  return toJson(reminder);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const [{ id }, context] = await Promise.all([params, getTenantContext()]);

  try {
    const reminder = await updateReminder(id, await request.json(), {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });

    return toJson(reminder);
  } catch (error) {
    return handleDomainRouteError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const [{ id }, context] = await Promise.all([params, getTenantContext()]);

  try {
    await deleteReminder(id, {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleDomainRouteError(error);
  }
}
