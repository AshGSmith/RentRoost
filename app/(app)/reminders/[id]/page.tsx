import Link from "next/link";
import { notFound } from "next/navigation";

import {
  completeReminderAction,
  deleteReminderAction,
  reopenReminderAction
} from "@/app/(app)/reminders/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getTenantContext } from "@/lib/auth/tenant";
import { getReminderForUser } from "@/lib/domain/queries";
import { formatDate, formatDateTime } from "@/lib/domain/utils";

export default async function ReminderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { tenantUserId }] = await Promise.all([params, getTenantContext()]);
  const reminder = await getReminderForUser(tenantUserId, id);

  if (!reminder) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reminder detail"
        description={reminder.description}
        actions={
          <div className="flex gap-3">
            <Button asChild variant="secondary">
              <Link href={`/reminders/${reminder.id}/edit`}>Edit</Link>
            </Button>
            <form action={deleteReminderAction}>
              <input name="id" type="hidden" value={reminder.id} />
              <Button type="submit" variant="danger">Delete</Button>
            </form>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">Due date</p>
          <p className="font-semibold text-slate-950 dark:text-white">{formatDate(reminder.dueDate)}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">Reminder time</p>
          <p className="font-semibold text-slate-950 dark:text-white">{formatDateTime(reminder.reminderAt)}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">Status</p>
          <p className="font-semibold text-slate-950 dark:text-white">{reminder.isComplete ? "Complete" : "Open"}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">Completed at</p>
          <p className="font-semibold text-slate-950 dark:text-white">{reminder.completedAt ? formatDate(reminder.completedAt) : "Not completed"}</p>
        </Card>
      </div>

      <Card className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {reminder.critical ? <Badge variant="warning">Critical compliance event</Badge> : null}
          {reminder.kind === "RENT_REVIEW" ? <Badge>Rent review</Badge> : null}
          {reminder.recurring && reminder.recurringFrequency ? <Badge variant="success">{reminder.recurringFrequency}</Badge> : null}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <p className="text-sm text-slate-500 dark:text-slate-400">Linked tenancy</p>
            <p className="font-medium text-slate-950 dark:text-white">
              {reminder.tenancyAgreement ? (
                <Link className="text-brand-700 dark:text-brand-300" href={`/tenancy/${reminder.tenancyAgreement.id}`}>
                  {reminder.tenancyAgreement.property.name}
                </Link>
              ) : (
                "None"
              )}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-slate-500 dark:text-slate-400">Linked property</p>
            <p className="font-medium text-slate-950 dark:text-white">
              {reminder.property ? (
                <Link className="text-brand-700 dark:text-brand-300" href={`/properties/${reminder.property.id}`}>
                  {reminder.property.name}
                </Link>
              ) : (
                "None"
              )}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-slate-500 dark:text-slate-400">Last notified</p>
            <p className="font-medium text-slate-950 dark:text-white">{reminder.lastNotifiedAt ? formatDateTime(reminder.lastNotifiedAt) : "Not yet sent"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-slate-500 dark:text-slate-400">Notification failure</p>
            <p className="font-medium text-slate-950 dark:text-white">{reminder.notificationFailureMessage ?? "None"}</p>
          </div>
        </div>
        {!reminder.isComplete ? (
          <form action={completeReminderAction}>
            <input name="id" type="hidden" value={reminder.id} />
            <input name="redirectTo" type="hidden" value={`/reminders/${reminder.id}`} />
            <Button type="submit">Mark complete</Button>
          </form>
        ) : (
          <form action={reopenReminderAction}>
            <input name="id" type="hidden" value={reminder.id} />
            <input name="redirectTo" type="hidden" value={`/reminders/${reminder.id}`} />
            <Button type="submit" variant="secondary">Reopen reminder</Button>
          </form>
        )}
      </Card>
    </div>
  );
}
