import Link from "next/link";

import { requestPasswordResetAction } from "@/app/(auth)/auth-actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

export default async function ForgotPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const params = await searchParams;

  return (
    <Card className="w-full max-w-lg space-y-8 p-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-950 dark:text-white">Reset password</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          We will generate a secure reset link for the account if it exists.
        </p>
      </div>

      {params.sent ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          If the email exists, a reset link has been prepared. In this MVP it is logged to the server console.
        </p>
      ) : null}

      <form action={requestPasswordResetAction} className="space-y-5">
        <FormField htmlFor="email" label="Email">
          <Input id="email" name="email" required type="email" />
        </FormField>
        <SubmitButton pendingLabel="Generating link...">Send reset link</SubmitButton>
      </form>

      <Link className="text-sm text-brand-700 hover:text-brand-800 dark:text-brand-300" href="/login">
        Back to sign in
      </Link>
    </Card>
  );
}
