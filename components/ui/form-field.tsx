import { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  children,
  className
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <label className="block text-sm font-medium text-slate-800 dark:text-slate-200" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
