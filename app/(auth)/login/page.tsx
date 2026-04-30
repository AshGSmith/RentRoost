import Link from "next/link";

import { loginAction } from "@/app/(auth)/auth-actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <Card className="w-full max-w-lg space-y-8 p-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-950 dark:text-white">Sign in</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Access your RentRoost workspace securely.
        </p>
      </div>

      {params.error ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{params.error}</p> : null}
      {params.message ? <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{params.message}</p> : null}

      <form action={loginAction} className="space-y-5">
        <FormField htmlFor="email" label="Email">
          <Input id="email" name="email" placeholder="name@company.com" required type="email" />
        </FormField>
        <FormField htmlFor="password" label="Password">
          <Input id="password" name="password" required type="password" />
        </FormField>
        <SubmitButton pendingLabel="Signing in...">Sign in</SubmitButton>
      </form>

      <div className="flex flex-col gap-2 text-sm text-slate-600 dark:text-slate-400 sm:flex-row sm:justify-between">
        <Link className="text-brand-700 hover:text-brand-800 dark:text-brand-300" href="/forgot-password">
          Forgot password?
        </Link>
        <p>
          New here?{" "}
          <Link className="text-brand-700 hover:text-brand-800 dark:text-brand-300" href="/register">
            Create an account
          </Link>
        </p>
      </div>
    </Card>
  );
}
