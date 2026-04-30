"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getTenantContext } from "@/lib/auth/tenant";
import {
  BackupError,
  importUserBackup,
  resolveBackupTargetUserId
} from "@/lib/backup/service";
import { type FormState } from "@/lib/domain/form-state";

export async function importBackupAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getTenantContext();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return {
      message: "Choose a backup file to import.",
      errors: {
        file: ["Choose a backup file to import."]
      }
    };
  }

  try {
    const targetUserId = resolveBackupTargetUserId({
      actorRole: context.user.role,
      actorTenantUserId: context.tenantUserId,
      managedUserId: String(formData.get("managedUserId") ?? "")
    });
    const parsed = JSON.parse(Buffer.from(await file.arrayBuffer()).toString("utf8"));
    const result = await importUserBackup(targetUserId, parsed);

    revalidatePath("/backup");
    revalidatePath("/dashboard");
    redirect(`/backup?imported=${encodeURIComponent(result.imported.join(", "))}`);
  } catch (error) {
    if (error instanceof BackupError) {
      return { message: error.message, errors: error.fieldErrors };
    }

    if (error instanceof SyntaxError) {
      return { message: "Backup file is not valid JSON." };
    }

    throw error;
  }
}
