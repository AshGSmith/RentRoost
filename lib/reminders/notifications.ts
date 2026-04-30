import { prisma } from "@/lib/prisma";

export type ReminderNotificationPayload = {
  reminderId: string;
  userId: string;
  description: string;
  dueDate: Date;
  critical: boolean;
};

export type ReminderNotifier = {
  send(payload: ReminderNotificationPayload): Promise<void>;
};

export const stubReminderNotifier: ReminderNotifier = {
  async send(payload) {
    console.info(
      `[ReminderNotifier] Reminder ${payload.reminderId} due ${payload.dueDate.toISOString()} critical=${payload.critical} :: ${payload.description}`
    );
  }
};

export async function listDueReminderNotifications(userId?: string, now = new Date()) {
  return prisma.reminder.findMany({
    where: {
      ...(userId ? { userId } : {}),
      isComplete: false,
      reminderAt: {
        lte: now
      },
      lastNotifiedAt: null
    },
    include: {
      property: true,
      tenancyAgreement: {
        include: {
          property: true
        }
      }
    },
    orderBy: [{ critical: "desc" }, { reminderAt: "asc" }]
  });
}

export async function processDueReminderNotifications(options?: {
  userId?: string;
  now?: Date;
  notifier?: ReminderNotifier;
}) {
  const now = options?.now ?? new Date();
  const notifier = options?.notifier ?? stubReminderNotifier;
  const reminders = await listDueReminderNotifications(options?.userId, now);

  const results: Array<{ reminderId: string; status: "sent" | "failed"; error?: string }> = [];

  for (const reminder of reminders) {
    try {
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: {
          lastNotificationAttemptAt: now,
          notificationFailureAt: null,
          notificationFailureMessage: null
        }
      });

      await notifier.send({
        reminderId: reminder.id,
        userId: reminder.userId,
        description: reminder.description,
        dueDate: reminder.dueDate,
        critical: reminder.critical
      });

      await prisma.reminder.update({
        where: { id: reminder.id },
        data: {
          lastNotifiedAt: now
        }
      });

      results.push({ reminderId: reminder.id, status: "sent" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown notification error";

      await prisma.reminder.update({
        where: { id: reminder.id },
        data: {
          lastNotificationAttemptAt: now,
          notificationFailureAt: now,
          notificationFailureMessage: message
        }
      });

      results.push({ reminderId: reminder.id, status: "failed", error: message });
    }
  }

  return {
    processedAt: now,
    count: results.length,
    results
  };
}
