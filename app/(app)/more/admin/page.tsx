import { redirect } from "next/navigation";

import { startImpersonationAction, stopImpersonationAction } from "@/app/(auth)/auth-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/prisma";
import { requireAdminViewer } from "@/lib/auth/session";
import { formatName } from "@/lib/utils";

export default async function AdminPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const context = await requireAdminViewer();

  if (context.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const users = await prisma.user.findMany({
    orderBy: {
      createdAt: "asc"
    },
    include: {
      organisation: true
    }
  });

  return (
    <div className="space-y-8">
      <PageHeader
        description="Admin-only access with impersonation controls and an overview of tenant accounts."
        title="Admin"
      />

      {params.error ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{params.error}</p> : null}

      {context.session.impersonatedUserId ? (
        <Card className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Impersonation active</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Stop the current impersonation to return to your own tenant scope.
            </p>
          </div>
          <form action={stopImpersonationAction}>
            <Button type="submit" variant="secondary">
              Stop impersonation
            </Button>
          </form>
        </Card>
      ) : null}

      <DataTable
        headers={["User", "Role", "Organisation", "Status", "Action"]}
        rows={users.map((user) => [
          <div className="space-y-1" key={`${user.id}-identity`}>
            <p className="font-medium text-slate-950 dark:text-white">{formatName(user.firstName, user.lastName)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
          </div>,
          <Badge key={`${user.id}-role`} variant={user.role === "ADMIN" ? "warning" : "default"}>
            {user.role}
          </Badge>,
          <span key={`${user.id}-org`}>{user.organisation?.organisationName ?? "Not configured"}</span>,
          <Badge key={`${user.id}-status`} variant={user.isActive ? "success" : "warning"}>
            {user.isActive ? "Active" : "Inactive"}
          </Badge>,
          user.id === context.user.id ? (
            <span className="text-xs text-slate-500 dark:text-slate-400" key={`${user.id}-self`}>
              Current admin
            </span>
          ) : (
            <form action={startImpersonationAction} key={`${user.id}-action`}>
              <input name="targetUserId" type="hidden" value={user.id} />
              <Button size="sm" type="submit" variant="secondary">
                Impersonate
              </Button>
            </form>
          )
        ])}
      />
    </div>
  );
}
