import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/layout/mobile-nav";
import { initials } from "@/lib/utils";

export function AppTopbar({
  userName,
  email,
  isImpersonating,
  viewerName
}: {
  userName: string;
  email: string;
  isImpersonating: boolean;
  viewerName: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-8">
        <div className="flex items-center gap-3">
          <MobileNav />
          <div>
            <p className="text-sm font-medium text-slate-950 dark:text-white">{viewerName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{email}</p>
          </div>
          {isImpersonating ? <Badge variant="warning">Impersonating</Badge> : null}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-right dark:border-slate-800 dark:bg-slate-900 md:block">
            <p className="text-sm font-semibold text-slate-950 dark:text-white">{userName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Secure workspace</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-600 font-semibold text-white">
            {initials(userName.split(" ")[0] ?? "R", userName.split(" ")[1] ?? "R")}
          </div>
          <Button asChild size="sm" variant="secondary">
            <Link href="/more">More</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
