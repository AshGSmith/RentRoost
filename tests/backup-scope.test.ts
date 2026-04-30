import test from "node:test";
import assert from "node:assert/strict";

import { BackupError, resolveBackupTargetUserId } from "@/lib/backup/service";

test("non-admin users cannot target managed backup actions", () => {
  assert.throws(
    () =>
      resolveBackupTargetUserId({
        actorRole: "USER",
        actorTenantUserId: "user-1",
        managedUserId: "user-2"
      }),
    BackupError
  );
});

test("admins can intentionally target another user", () => {
  const target = resolveBackupTargetUserId({
    actorRole: "ADMIN",
    actorTenantUserId: "admin-1",
    managedUserId: "user-2"
  });

  assert.equal(target, "user-2");
});

test("default backup scope is always the signed-in tenant user", () => {
  const target = resolveBackupTargetUserId({
    actorRole: "USER",
    actorTenantUserId: "user-1"
  });

  assert.equal(target, "user-1");
});
