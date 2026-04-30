"use server";

import { redirect } from "next/navigation";

import { createAuditLog } from "@/lib/auth/audit";
import { hashPassword, verifyPassword } from "@/lib/auth/passwords";
import { createSession, destroySession, requireAdminViewer, requireSession, requireViewer } from "@/lib/auth/session";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { env } from "@/lib/env";
import { ensureDefaultCashflowCategories } from "@/lib/finance/service";
import { prisma } from "@/lib/prisma";

function toQueryMessage(message: string) {
  return encodeURIComponent(message);
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      settings: true,
      organisation: true
    }
  });

  if (!user || !user.isActive || !(await verifyPassword(password, user.passwordHash))) {
    redirect(`/login?error=${toQueryMessage("Invalid email or password.")}`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date()
    }
  });

  await createSession(user.id);
  await createAuditLog({
    action: "auth.login",
    entityType: "User",
    entityId: user.id,
    userId: user.id,
    actorUserId: user.id
  });

  redirect("/dashboard");
}

export async function registerAction(formData: FormData) {
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!firstName || !lastName || !email || password.length < 8) {
    redirect(`/register?error=${toQueryMessage("Complete all fields and use a password with 8+ characters.")}`);
  }

  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    redirect(`/register?error=${toQueryMessage("An account already exists for that email address.")}`);
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      passwordHash,
      settings: {
        create: {
          currencyDesignator: "£",
          theme: "LIGHT"
        }
      },
      organisation: {
        create: {
          organisationName: `${firstName} ${lastName} Properties`,
          contactName: `${firstName} ${lastName}`,
          contactEmail: email
        }
      }
    }
  });

  await createAuditLog({
    action: "auth.register",
    entityType: "User",
    entityId: user.id,
    userId: user.id,
    actorUserId: user.id
  });

  await ensureDefaultCashflowCategories(user.id);
  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  const context = await requireViewer();

  await createAuditLog({
    action: "auth.logout",
    entityType: "User",
    entityId: context.user.id,
    userId: context.viewer.id,
    actorUserId: context.user.id
  });

  await destroySession();
  redirect("/login");
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (user) {
    await prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null
      },
      data: {
        usedAt: new Date()
      }
    });

    const token = generateToken();
    await prisma.passwordResetToken.create({
      data: {
        tokenHash: hashToken(token),
        userId: user.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60)
      }
    });

    const resetUrl = `${env.APP_URL}/reset-password?token=${token}`;
    console.info(`Password reset requested for ${email}: ${resetUrl}`);

    await createAuditLog({
      action: "auth.password_reset.requested",
      entityType: "User",
      entityId: user.id,
      userId: user.id,
      actorUserId: user.id
    });
  }

  redirect("/forgot-password?sent=1");
}

export async function resetPasswordAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!token || password.length < 8 || password !== confirmPassword) {
    redirect(`/reset-password?token=${encodeURIComponent(token)}&error=${toQueryMessage("Use matching passwords with at least 8 characters.")}`);
  }

  const tokenRecord = await prisma.passwordResetToken.findUnique({
    where: {
      tokenHash: hashToken(token)
    },
    include: {
      user: true
    }
  });

  if (!tokenRecord || tokenRecord.usedAt || tokenRecord.expiresAt < new Date()) {
    redirect(`/reset-password?error=${toQueryMessage("That reset link is invalid or has expired.")}`);
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: tokenRecord.userId },
      data: { passwordHash }
    }),
    prisma.passwordResetToken.update({
      where: { id: tokenRecord.id },
      data: { usedAt: new Date() }
    }),
    prisma.session.deleteMany({
      where: { userId: tokenRecord.userId }
    })
  ]);

  await createAuditLog({
    action: "auth.password_reset.completed",
    entityType: "User",
    entityId: tokenRecord.userId,
    userId: tokenRecord.userId,
    actorUserId: tokenRecord.userId
  });

  redirect("/login?message=Password%20updated.%20Please%20sign%20in.");
}

export async function startImpersonationAction(formData: FormData) {
  const targetUserId = String(formData.get("targetUserId") ?? "");
  const session = await requireSession();
  const context = await requireAdminViewer();

  if (!targetUserId || targetUserId === context.user.id) {
    redirect("/more/admin?error=Choose%20another%20user%20to%20impersonate.");
  }

  await prisma.session.update({
    where: { id: session.id },
    data: {
      impersonatedUserId: targetUserId
    }
  });

  await createAuditLog({
    action: "auth.impersonation.started",
    entityType: "User",
    entityId: targetUserId,
    userId: targetUserId,
    actorUserId: context.user.id,
    metadata: {
      sessionId: session.id
    }
  });

  redirect("/dashboard");
}

export async function stopImpersonationAction() {
  const session = await requireSession();

  if (!session.impersonatedUserId) {
    redirect("/dashboard");
  }

  const adminUserId = session.userId;
  const previousUserId = session.impersonatedUserId;

  await prisma.session.update({
    where: { id: session.id },
    data: {
      impersonatedUserId: null
    }
  });

  await createAuditLog({
    action: "auth.impersonation.stopped",
    entityType: "User",
    entityId: previousUserId,
    userId: previousUserId,
    actorUserId: adminUserId,
    metadata: {
      sessionId: session.id
    }
  });

  redirect("/more/admin");
}
