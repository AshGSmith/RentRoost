import { NextResponse } from "next/server";

import { getTenantContext } from "@/lib/auth/tenant";
import {
  exportUserBackup,
  resolveBackupTargetUserId
} from "@/lib/backup/service";

export async function GET(request: Request) {
  const context = await getTenantContext();
  const { searchParams } = new URL(request.url);
  const targetUserId = resolveBackupTargetUserId({
    actorRole: context.user.role,
    actorTenantUserId: context.tenantUserId,
    managedUserId: searchParams.get("managedUserId")
  });
  const payload = await exportUserBackup(targetUserId);
  const filename = `rentroost-backup-${targetUserId}-${new Date().toISOString().slice(0, 10)}.json`;

  return NextResponse.json(payload, {
    headers: {
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
