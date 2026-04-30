import { NextResponse } from "next/server";

import { getTenantContext } from "@/lib/auth/tenant";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { tenantUserId } = await getTenantContext();
  const organisation = await prisma.organisationSettings.findUnique({
    where: {
      userId: tenantUserId
    }
  });

  if (!organisation?.logoData || !organisation.logoMimeType) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(Buffer.from(organisation.logoData), {
    headers: {
      "Content-Type": organisation.logoMimeType,
      "Cache-Control": "private, max-age=60"
    }
  });
}
