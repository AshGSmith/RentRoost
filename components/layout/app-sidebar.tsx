"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ReceiptText, Wallet, FileBarChart2, Home, BellRing, FolderOpen, FileStack, Settings, DatabaseBackup, MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/reconcile", label: "Reconcile", icon: ReceiptText },
  { href: "/cashflow", label: "Cashflow", icon: Wallet },
  { href: "/reports", label: "Reports", icon: FileBarChart2 },
  { href: "/tenancy", label: "Tenancies", icon: Home },
  { href: "/reminders", label: "Reminders", icon: BellRing },
  { href: "/documents", label: "Documents", icon: FolderOpen },
  { href: "/templates", label: "Templates", icon: FileStack },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/backup", label: "Backup", icon: DatabaseBackup },
  { href: "/more", label: "More", icon: MoreHorizontal }
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-72 flex-col border-r border-slate-200 bg-white/95 px-5 py-6 dark:border-slate-800 dark:bg-slate-950/90 lg:flex">
      <Link className="mb-8 flex items-center gap-3" href="/dashboard">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-600 text-lg font-semibold text-white">
          R
        </div>
        <div>
          <p className="text-lg font-semibold text-slate-950 dark:text-white">RentRoost</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Rental finance portal</p>
        </div>
      </Link>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                active
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
              )}
              href={item.href}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
