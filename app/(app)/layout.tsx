import { AppShell } from "@/components/layout/app-shell";
import { requireViewer } from "@/lib/auth/session";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const context = await requireViewer();

  return (
    <AppShell
      session={{
        user: {
          firstName: context.user.firstName,
          lastName: context.user.lastName,
          email: context.user.email
        },
        impersonatedUserId: context.session.impersonatedUserId
      }}
      viewer={{
        firstName: context.viewer.firstName,
        lastName: context.viewer.lastName
      }}
    >
      {children}
    </AppShell>
  );
}
