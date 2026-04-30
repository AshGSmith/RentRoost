import { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Badge({
  children,
  variant = "default"
}: {
  children: ReactNode;
  variant?: "default" | "success" | "warning";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        variant === "default" &&
          "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-200",
        variant === "success" &&
          "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200",
        variant === "warning" &&
          "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-200"
      )}
    >
      {children}
    </span>
  );
}
