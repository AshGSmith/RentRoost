"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ReactNode } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

export function Modal({
  trigger,
  title,
  description,
  children
}: {
  trigger: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950"
          )}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <Dialog.Title className="text-lg font-semibold text-slate-950 dark:text-white">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="text-sm text-slate-600 dark:text-slate-400">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-900">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
