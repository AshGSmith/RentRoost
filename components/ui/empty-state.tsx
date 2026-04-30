import { ReactNode } from "react";

import { Card } from "@/components/ui/card";

export function EmptyState({
  title,
  description,
  action,
  icon
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-start gap-4 p-8">
      {icon ? (
        <div className="rounded-2xl bg-brand-50 p-3 text-brand-700 dark:bg-brand-950/60 dark:text-brand-200">
          {icon}
        </div>
      ) : null}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-slate-950 dark:text-white">{title}</h3>
        <p className="max-w-xl text-sm text-slate-600 dark:text-slate-400">{description}</p>
      </div>
      {action}
    </Card>
  );
}
