import { ReactNode } from "react";

import { Card } from "@/components/ui/card";

export function TileCard({
  label,
  value,
  meta,
  icon
}: {
  label: string;
  value: string;
  meta?: string;
  icon?: ReactNode;
}) {
  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        {icon ? <div className="text-brand-600 dark:text-brand-300">{icon}</div> : null}
      </div>
      <div className="space-y-1">
        <p className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{value}</p>
        {meta ? <p className="text-sm text-slate-500 dark:text-slate-400">{meta}</p> : null}
      </div>
    </Card>
  );
}
