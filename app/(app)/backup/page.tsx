import Link from "next/link";

import { DatabaseBackup, Download } from "lucide-react";

import { ImportBackupForm } from "@/components/backup/import-backup-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getTenantContext } from "@/lib/auth/tenant";
import { listManagedBackupUsers } from "@/lib/backup/service";

export default async function BackupPage({
  searchParams
}: {
  searchParams: Promise<{ imported?: string }>;
}) {
  const [{ imported }, context] = await Promise.all([searchParams, getTenantContext()]);
  const users = context.user.role === "ADMIN" ? await listManagedBackupUsers() : [];

  return (
    <div className="space-y-8">
      <PageHeader
        description="Export a structured backup of your data or safely import a backup file into the current signed-in account."
        title="Backup"
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Export backup</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Exports a versioned JSON file containing your database-backed app data.
            </p>
          </div>
          <Button asChild>
            <Link href="/api/backup/export">
              <Download className="h-4 w-4" />
              Export my data
            </Link>
          </Button>
          {context.user.role === "ADMIN" ? (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-blue-100">
              Managed exports are available via query string:
              <br />
              <code>/api/backup/export?managedUserId=&lt;user-id&gt;</code>
            </div>
          ) : null}
        </Card>

        <Card className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Import backup</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Imports into your signed-in account by default. Admins can intentionally target another user.
            </p>
          </div>
          <ImportBackupForm
            importedMessage={imported}
            isAdmin={context.user.role === "ADMIN"}
            users={users.map((user) => ({ id: user.id, email: user.email, role: user.role }))}
          />
        </Card>
      </div>

      <Card className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-brand-100 p-2 text-brand-700 dark:bg-brand-950/60 dark:text-brand-200">
            <DatabaseBackup className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-950 dark:text-white">Included in backups</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Organisation settings, categories, landlords, properties, tenants, tenancies, rent changes, reminders, income, expenses, bank account metadata, reconciliation rules, document records, and templates.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
