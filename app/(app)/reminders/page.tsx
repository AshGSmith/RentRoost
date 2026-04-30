import Link from "next/link";
import { BellRing } from "lucide-react";

import { completeReminderAction } from "@/app/(app)/reminders/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getTenantContext } from "@/lib/auth/tenant";
import { listRemindersForUser } from "@/lib/domain/queries";
import { formatDate, formatDateTime } from "@/lib/domain/utils";

const filters = [
  { value: "incomplete", label: "Incomplete" },
  { value: "complete", label: "Complete" },
  { value: "critical", label: "Critical" },
  { value: "overdue", label: "Overdue" }
] as const;

export default async function RemindersPage({
  searchParams
}: {
  searchParams: Promise<{ filter?: "incomplete" | "complete" | "critical" | "overdue" }>;
}) {
  const [{ filter }, { tenantUserId }] = await Promise.all([searchParams, getTenantContext()]);
  const activeFilter = filter ?? "incomplete";
  const reminders = await listRemindersForUser(tenantUserId, activeFilter);

  return (
    <div className="space-y-8">
      <PageHeader
        description="One place for operational reminders and critical compliance events."
        title="Reminders"
        actions={
          <Button asChild>
            <Link href="/reminders/new">New reminder</Link>
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <Button asChild key={item.value} variant={activeFilter === item.value ? "primary" : "secondary"}>
            <Link href={`/reminders?filter=${item.value}`}>{item.label}</Link>
          </Button>
        ))}
      </div>

      {reminders.length === 0 ? (
        <EmptyState
          description="Create reminders for property operations, tenancy events and compliance deadlines."
          icon={<BellRing className="h-5 w-5" />}
          title="No reminders match this filter"
          action={
            <Button asChild>
              <Link href="/reminders/new">Create reminder</Link>
            </Button>
          }
        />
      ) : (
        <DataTable
          headers={["Reminder", "Due", "Reminder at", "Status", "Link", "Actions"]}
          rows={reminders.map((reminder) => [
            <div className="space-y-1" key={reminder.id}>
              <p className="font-medium text-slate-950 dark:text-white">{reminder.description}</p>
              <div className="flex flex-wrap gap-2">
                {reminder.critical ? <Badge variant="warning">Critical</Badge> : null}
                {reminder.kind === "RENT_REVIEW" ? <Badge>Rent review</Badge> : null}
                {reminder.recurring && reminder.recurringFrequency ? <Badge variant="success">{reminder.recurringFrequency}</Badge> : null}
              </div>
            </div>,
            formatDate(reminder.dueDate),
            formatDateTime(reminder.reminderAt),
            reminder.isComplete ? "Complete" : reminder.dueDate < new Date() ? "Overdue" : "Open",
            reminder.tenancyAgreement
              ? `Tenancy: ${reminder.tenancyAgreement.property.name}`
              : reminder.property
                ? `Property: ${reminder.property.name}`
                : "Unlinked",
            <div className="flex gap-2" key={`${reminder.id}-actions`}>
              <Button asChild size="sm" variant="secondary">
                <Link href={`/reminders/${reminder.id}`}>View</Link>
              </Button>
              {!reminder.isComplete ? (
                <form action={completeReminderAction}>
                  <input name="id" type="hidden" value={reminder.id} />
                  <input name="redirectTo" type="hidden" value={`/reminders?filter=${activeFilter}`} />
                  <Button size="sm" type="submit" variant="primary">Complete</Button>
                </form>
              ) : null}
            </div>
          ])}
        />
      )}
    </div>
  );
}
