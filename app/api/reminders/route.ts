import { getTenantContext } from "@/lib/auth/tenant";
import { handleDomainRouteError, toJson } from "@/lib/domain/api";
import { listRemindersForUser } from "@/lib/domain/queries";
import { createReminder } from "@/lib/domain/services";

export async function GET(request: Request) {
  const { tenantUserId } = await getTenantContext();
  const url = new URL(request.url);
  const filter = url.searchParams.get("filter");
  const reminders = await listRemindersForUser(
    tenantUserId,
    filter === "complete" || filter === "critical" || filter === "overdue" ? filter : "incomplete"
  );

  return toJson(reminders);
}

export async function POST(request: Request) {
  const context = await getTenantContext();

  try {
    const reminder = await createReminder(await request.json(), {
      tenantUserId: context.tenantUserId,
      actorUserId: context.user.id
    });

    return toJson(reminder, 201);
  } catch (error) {
    return handleDomainRouteError(error);
  }
}
