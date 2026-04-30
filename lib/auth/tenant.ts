import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/auth/session";

export async function getTenantContext() {
  const context = await requireViewer();

  return {
    ...context,
    tenantUserId: context.viewer.id
  };
}

export async function getTenantSettings() {
  const { tenantUserId } = await getTenantContext();

  const [settings, organisation] = await Promise.all([
    prisma.userSettings.findUnique({
      where: {
        userId: tenantUserId
      }
    }),
    prisma.organisationSettings.findUnique({
      where: {
        userId: tenantUserId
      }
    })
  ]);

  return {
    settings,
    organisation
  };
}
