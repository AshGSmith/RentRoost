"use server";

import { redirect } from "next/navigation";

import { createAuditLog } from "@/lib/auth/audit";
import { getTenantContext } from "@/lib/auth/tenant";
import { prisma } from "@/lib/prisma";

function normaliseString(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function updatePreferencesAction(formData: FormData) {
  const { tenantUserId, user } = await getTenantContext();
  const theme = normaliseString(formData.get("theme"));
  const currencyDesignator = normaliseString(formData.get("currencyDesignator")) || "£";

  await prisma.userSettings.upsert({
    where: { userId: tenantUserId },
    update: {
      theme: theme === "DARK" ? "DARK" : "LIGHT",
      currencyDesignator
    },
    create: {
      userId: tenantUserId,
      theme: theme === "DARK" ? "DARK" : "LIGHT",
      currencyDesignator
    }
  });

  await createAuditLog({
    action: "settings.preferences.updated",
    entityType: "UserSettings",
    entityId: tenantUserId,
    userId: tenantUserId,
    actorUserId: user.id
  });

  redirect("/settings?updated=preferences");
}

export async function updateOrganisationAction(formData: FormData) {
  const { tenantUserId, user } = await getTenantContext();
  const organisationName = normaliseString(formData.get("organisationName")) || "My Organisation";
  const contactName = normaliseString(formData.get("contactName"));
  const contactNumber = normaliseString(formData.get("contactNumber"));
  const contactEmail = normaliseString(formData.get("contactEmail"));
  const bankName = normaliseString(formData.get("bankName"));
  const bankSortCode = normaliseString(formData.get("bankSortCode"));
  const bankAccountNumber = normaliseString(formData.get("bankAccountNumber"));
  const bankAccountName = normaliseString(formData.get("bankAccountName"));
  const logoFile = formData.get("logo");

  const logoInput =
    logoFile instanceof File && logoFile.size > 0
      ? {
          logoData: Buffer.from(await logoFile.arrayBuffer()),
          logoMimeType: logoFile.type || "application/octet-stream",
          logoFileName: logoFile.name
        }
      : null;

  await prisma.organisationSettings.upsert({
    where: { userId: tenantUserId },
    update: {
      organisationName,
      contactName,
      contactNumber,
      contactEmail,
      bankName,
      bankSortCode,
      bankAccountNumber,
      bankAccountName,
      ...(logoInput ?? {})
    },
    create: {
      userId: tenantUserId,
      organisationName,
      contactName,
      contactNumber,
      contactEmail,
      bankName,
      bankSortCode,
      bankAccountNumber,
      bankAccountName,
      ...(logoInput ?? {})
    }
  });

  await createAuditLog({
    action: "settings.organisation.updated",
    entityType: "OrganisationSettings",
    entityId: tenantUserId,
    userId: tenantUserId,
    actorUserId: user.id
  });

  redirect("/settings?updated=organisation");
}
