import Link from "next/link";

import { cn } from "@/lib/utils";

const domainLinks = [
  { href: "/tenancy", label: "Tenancies" },
  { href: "/properties", label: "Properties" },
  { href: "/landlords", label: "Landlords" },
  { href: "/tenants", label: "Tenants" }
];

export function DomainNav({ activeHref }: { activeHref: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {domainLinks.map((item) => (
        <Link
          key={item.href}
          className={cn(
            "rounded-xl px-4 py-2 text-sm font-medium transition",
            activeHref === item.href
              ? "bg-brand-600 text-white"
              : "bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
          )}
          href={item.href}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
