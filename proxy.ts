import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PROTECTED_PATHS = [
  "/dashboard",
  "/reconcile",
  "/cashflow",
  "/reports",
  "/tenancy",
  "/reminders",
  "/documents",
  "/templates",
  "/settings",
  "/backup",
  "/more",
  "/landlords",
  "/properties",
  "/tenants"
];

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  if (!isProtected) {
    return NextResponse.next();
  }

  if (!request.cookies.get(process.env.SESSION_COOKIE_NAME ?? "rentroost_session")?.value) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
