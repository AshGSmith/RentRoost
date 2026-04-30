"use client";

import { useActionState } from "react";

import { importBackupAction } from "@/app/(app)/backup/actions";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/domain/form-state";

export function ImportBackupForm({
  users,
  isAdmin,
  importedMessage
}: {
  users: Array<{ id: string; email: string; role: string }>;
  isAdmin: boolean;
  importedMessage?: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(importBackupAction, EMPTY_FORM_STATE);

  return (
    <form action={formAction} className="grid gap-4">
      {importedMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
          Import complete: {importedMessage}
        </div>
      ) : null}
      <FormMessage state={state} />
      <div className="grid gap-2">
        <label className="text-sm font-medium text-slate-900 dark:text-slate-100" htmlFor="file">
          Backup file
        </label>
        <input
          className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          id="file"
          name="file"
          required
          type="file"
        />
      </div>
      {isAdmin ? (
        <div className="grid gap-2">
          <label className="text-sm font-medium text-slate-900 dark:text-slate-100" htmlFor="managedUserId">
            Managed target user
          </label>
          <select
            className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            id="managedUserId"
            name="managedUserId"
          >
            <option value="">Import into signed-in user</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>{`${user.email} (${user.role})`}</option>
            ))}
          </select>
        </div>
      ) : null}
      <SubmitButton pendingLabel="Importing backup...">Import backup</SubmitButton>
    </form>
  );
}
