import { getTenantContext } from "@/lib/auth/tenant";
import { processDueReminderNotifications } from "@/lib/reminders/notifications";

export async function POST() {
  const { tenantUserId } = await getTenantContext();

  const result = await processDueReminderNotifications({
    userId: tenantUserId
  });

  return Response.json(result);
}
