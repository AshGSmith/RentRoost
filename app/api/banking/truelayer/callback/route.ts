import { NextResponse } from "next/server";

import { completeBankAccountLink, ReconcileError } from "@/lib/reconcile/service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(new URL("/reconcile?error=missing_provider_callback", request.url));
  }

  try {
    const accounts = await completeBankAccountLink("truelayer", code, state);
    const targetId = accounts[0]?.id;

    return NextResponse.redirect(new URL(targetId ? `/reconcile/${targetId}` : "/reconcile", request.url));
  } catch (error) {
    const message = error instanceof ReconcileError ? error.message : "provider_link_failed";
    return NextResponse.redirect(new URL(`/reconcile?error=${encodeURIComponent(message)}`, request.url));
  }
}
