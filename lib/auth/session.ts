import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { generateToken, hashToken } from "@/lib/auth/tokens";

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 14;

export async function createSession(userId: string) {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session.create({
    data: {
      tokenHash,
      userId,
      expiresAt
    }
  });

  const cookieStore = await cookies();
  cookieStore.set(env.SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/"
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(env.SESSION_COOKIE_NAME)?.value;

  if (token) {
    await prisma.session.deleteMany({
      where: {
        tokenHash: hashToken(token)
      }
    });
  }

  cookieStore.set(env.SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
    path: "/"
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(env.SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: {
      tokenHash: hashToken(token)
    },
    include: {
      user: {
        include: {
          settings: true,
          organisation: true
        }
      },
      impersonatedUser: {
        include: {
          settings: true,
          organisation: true
        }
      }
    }
  });

  if (!session || session.expiresAt < new Date() || !session.user.isActive) {
    await destroySession();
    return null;
  }

  return session;
}

export async function requireSession() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function requireViewer() {
  const session = await requireSession();
  const viewer = session.impersonatedUser ?? session.user;

  if (!viewer.isActive) {
    await destroySession();
    redirect("/login");
  }

  return {
    session,
    user: session.user,
    viewer,
    isImpersonating: Boolean(session.impersonatedUserId)
  };
}

export async function requireAdminViewer() {
  const context = await requireViewer();

  if (context.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return context;
}
