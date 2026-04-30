"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Tabs({
  defaultValue,
  tabs
}: {
  defaultValue: string;
  tabs: { value: string; label: string; content: ReactNode }[];
}) {
  return (
    <TabsPrimitive.Root className="space-y-6" defaultValue={defaultValue}>
      <TabsPrimitive.List className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-950">
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab.value}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium text-slate-500 transition data-[state=active]:bg-brand-600 data-[state=active]:text-white dark:text-slate-400"
            )}
            value={tab.value}
          >
            {tab.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {tabs.map((tab) => (
        <TabsPrimitive.Content key={tab.value} value={tab.value}>
          {tab.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}
