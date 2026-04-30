"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary"
}: {
  children: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit" variant={variant}>
      {pending ? pendingLabel ?? "Saving..." : children}
    </Button>
  );
}
