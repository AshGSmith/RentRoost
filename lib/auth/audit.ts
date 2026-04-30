import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function createAuditLog(input: {
  action: string;
  entityType: string;
  entityId: string;
  userId?: string | null;
  actorUserId?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.auditLog.create({
    data: {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      userId: input.userId ?? null,
      actorUserId: input.actorUserId ?? null,
      metadata: input.metadata
    }
  });
}
