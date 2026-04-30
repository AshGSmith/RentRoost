import { prisma } from "@/lib/prisma";
import { syncBankAccountTransactions } from "@/lib/reconcile/service";

function isAuthorized(request: Request) {
  const configuredSecret = process.env.BANK_PROVIDER_WEBHOOK_SECRET;

  if (!configuredSecret) {
    return false;
  }

  return request.headers.get("x-bank-provider-webhook-secret") === configuredSecret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = (await request.json()) as {
    providerAccountId?: string;
    account_id?: string;
  };
  const providerAccountId = payload.providerAccountId ?? payload.account_id;

  if (!providerAccountId) {
    return Response.json({ received: true, skipped: true });
  }

  const account = await prisma.bankAccount.findFirst({
    where: {
      provider: "truelayer",
      providerAccountId
    },
    select: {
      id: true,
      userId: true
    }
  });

  if (!account) {
    return Response.json({ received: true, skipped: true });
  }

  await prisma.bankAccount.update({
    where: { id: account.id },
    data: {
      lastWebhookAt: new Date()
    }
  });

  const result = await syncBankAccountTransactions(
    account.id,
    {
      tenantUserId: account.userId,
      actorUserId: account.userId
    },
    {
      actorUserId: null,
      reason: "webhook"
    }
  );

  return Response.json({ received: true, ...result });
}
