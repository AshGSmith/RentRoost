import Link from "next/link";
import { Shield, Settings2, DatabaseBackup, LogOut } from "lucide-react";

import { logoutAction } from "@/app/(auth)/auth-actions";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireViewer } from "@/lib/auth/session";

const moreCards = [
  {
    href: "/settings",
    title: "Settings",
    description: "Theme, currency, organisation profile and future account preferences.",
    icon: Settings2
  },
  {
    href: "/backup",
    title: "Backup",
    description: "Placeholder space for exports, recovery points and retention policies.",
    icon: DatabaseBackup
  },
  {
    href: "/more/admin",
    title: "Admin",
    description: "Role-gated management tools including tenant-safe impersonation.",
    icon: Shield
  }
];

export default async function MorePage() {
  const { user } = await requireViewer();

  return (
    <div className="space-y-8">
      <PageHeader
        description="Home for settings, admin utilities and other account-level tools."
        title="More"
      />

      <div className="grid gap-4 md:grid-cols-3">
        {moreCards
          .filter((card) => (card.href === "/more/admin" ? user.role === "ADMIN" : true))
          .map((card) => {
            const Icon = card.icon;

            return (
              <Link href={card.href} key={card.href}>
                <Card className="h-full space-y-4 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-xl">
                  <div className="inline-flex rounded-2xl bg-brand-50 p-3 text-brand-700 dark:bg-brand-950/60 dark:text-brand-200">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-slate-950 dark:text-white">{card.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{card.description}</p>
                  </div>
                </Card>
              </Link>
            );
          })}
      </div>

      <Card className="max-w-md space-y-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Session</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">End the current session securely.</p>
        </div>
        <form action={logoutAction}>
          <button className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-700" type="submit">
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </form>
      </Card>
    </div>
  );
}
