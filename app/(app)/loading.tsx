import { Card } from "@/components/ui/card";

export default function AppLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-9 w-56 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-80 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="space-y-3">
            <div className="h-4 w-28 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-8 w-36 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-full animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
          </Card>
        ))}
      </div>
    </div>
  );
}
