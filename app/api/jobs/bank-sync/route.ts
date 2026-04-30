import { getTenantContext } from "@/lib/auth/tenant";
import { syncAllConnectedBankAccounts } from "@/lib/reconcile/service";

function isAuthorized(request: Request) {
  const configuredSecret = process.env.BANK_PROVIDER_JOB_SECRET;

  if (!configuredSecret) {
    return false;
  }

  return request.headers.get("x-job-secret") === configuredSecret;
}

export async function POST(request: Request) {
  if (isAuthorized(request)) {
    const result = await syncAllConnectedBankAccounts({
      actorUserId: null,
      reason: "scheduled"
    });

    return Response.json(result);
  }

  const { tenantUserId, user } = await getTenantContext();
  const result = await syncAllConnectedBankAccounts({
    userId: tenantUserId,
    actorUserId: user.id,
    reason: "manual-job"
  });

  return Response.json(result);
}
