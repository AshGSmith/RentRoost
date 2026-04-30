import Link from "next/link";

import { registerAction } from "@/app/(auth)/auth-actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

export default async function RegisterPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <Card className="w-full max-w-lg space-y-8 p-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-950 dark:text-white">Create account</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Start with secure defaults and personalise the workspace later.
        </p>
      </div>

      {params.error ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{params.error}</p> : null}

      <form action={registerAction} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField htmlFor="firstName" label="First name">
            <Input id="firstName" name="firstName" required />
          </FormField>
          <FormField htmlFor="lastName" label="Last name">
            <Input id="lastName" name="lastName" required />
          </FormField>
        </div>
        <FormField htmlFor="email" label="Email">
          <Input id="email" name="email" required type="email" />
        </FormField>
        <FormField
          hint="Use at least 8 characters."
          htmlFor="password"
          label="Password"
        >
          <Input id="password" name="password" required type="password" />
        </FormField>
        <SubmitButton pendingLabel="Creating account...">Create account</SubmitButton>
      </form>

      <p className="text-sm text-slate-600 dark:text-slate-400">
        Already registered?{" "}
        <Link className="text-brand-700 hover:text-brand-800 dark:text-brand-300" href="/login">
          Sign in
        </Link>
      </p>
    </Card>
  );
}
