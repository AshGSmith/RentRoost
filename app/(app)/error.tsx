"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AppError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-950 dark:text-white">Something went wrong</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          The page could not be loaded right now. You can retry without losing your session.
        </p>
      </div>
      <Button onClick={reset} variant="secondary">Try again</Button>
    </Card>
  );
}
