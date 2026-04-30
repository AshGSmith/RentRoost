import Link from "next/link";

import { resetPasswordAction } from "@/app/(auth)/auth-actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <Card className="w-full max-w-lg space-y-8 p-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-950 dark:text-white">Choose a new password</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Reset links are single-use and expire automatically.
        </p>
      </div>

      {params.error ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{params.error}</p> : null}

      <form action={resetPasswordAction} className="space-y-5">
        <input name="token" type="hidden" value={params.token ?? ""} />
        <FormField htmlFor="password" label="New password">
          <Input id="password" name="password" required type="password" />
        </FormField>
        <FormField htmlFor="confirmPassword" label="Confirm password">
          <Input id="confirmPassword" name="confirmPassword" required type="password" />
        </FormField>
        <SubmitButton pendingLabel="Updating password...">Update password</SubmitButton>
      </form>

      <Link className="text-sm text-brand-700 hover:text-brand-800 dark:text-brand-300" href="/login">
        Back to sign in
      </Link>
    </Card>
  );
}
