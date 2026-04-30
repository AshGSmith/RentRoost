import { ReactNode } from "react";

import { stopImpersonationAction } from "@/app/(auth)/auth-actions";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatName } from "@/lib/utils";

export function AppShell({
  children,
  session,
  viewer
}: {
  children: ReactNode;
  session: {
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
    impersonatedUserId: string | null;
  };
  viewer: {
    firstName: string;
    lastName: string;
  };
}) {
  const ownerName = formatName(session.user.firstName, session.user.lastName);
  const viewerName = formatName(viewer.firstName, viewer.lastName);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="flex min-h-screen">
        <AppSidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <AppTopbar
            email={session.user.email}
            isImpersonating={Boolean(session.impersonatedUserId)}
            userName={ownerName}
            viewerName={viewerName}
          />

          {session.impersonatedUserId ? (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/30 md:px-8">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="warning">Admin impersonation</Badge>
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    You are currently acting as {viewerName}. Tenant scoping follows the impersonated user.
                  </p>
                </div>
                <form action={stopImpersonationAction}>
                  <Button size="sm" type="submit" variant="secondary">
                    Stop impersonation
                  </Button>
                </form>
              </div>
            </div>
          ) : null}

          <main className="flex-1 px-4 py-8 md:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
