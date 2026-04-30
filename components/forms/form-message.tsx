"use client";

import { FormState } from "@/lib/domain/form-state";

export function FormMessage({ state }: { state: FormState }) {
  if (!state.message) {
    return null;
  }

  return (
    <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">
      {state.message}
    </p>
  );
}
