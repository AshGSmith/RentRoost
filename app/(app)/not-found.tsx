import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function AppNotFound() {
  return (
    <EmptyState
      title="Record not found"
      description="The page or record you tried to open does not exist for this signed-in account."
      action={
        <Button asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      }
    />
  );
}
