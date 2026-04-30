"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";

const mobileItems = [
  ["Dashboard", "/dashboard"],
  ["Reconcile", "/reconcile"],
  ["Cashflow", "/cashflow"],
  ["Reports", "/reports"],
  ["Tenancy", "/tenancy"],
  ["Reminders", "/reminders"],
  ["Documents", "/documents"],
  ["Templates", "/templates"],
  ["Settings", "/settings"],
  ["Backup", "/backup"],
  ["More", "/more"]
] as const;

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <Button aria-label="Open navigation" onClick={() => setOpen(true)} size="sm" variant="secondary">
        <Menu className="h-4 w-4" />
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="mx-auto max-w-sm rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-lg font-semibold text-slate-950 dark:text-white">RentRoost</p>
              <Button aria-label="Close navigation" onClick={() => setOpen(false)} size="sm" variant="ghost">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-2">
              {mobileItems.map(([label, href]) => (
                <Link
                  key={href}
                  className="rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
                  href={href}
                  onClick={() => setOpen(false)}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
