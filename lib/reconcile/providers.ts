import { decryptSecret, encryptSecret } from "@/lib/crypto";

export type ProviderTransactionInput = {
  externalTransactionId?: string;
  bookedAt: Date;
  valueDate?: Date | null;
  amount: string;
  currency?: string;
  description: string;
  counterparty?: string | null;
  reference?: string | null;
  rawData?: Record<string, unknown>;
};

export type ProviderLinkedAccount = {
  providerAccountId: string;
  name: string;
  institutionName?: string | null;
  accountMask?: string | null;
  currency: string;
  accessTokenEnc: string;
  refreshTokenEnc?: string | null;
  tokenExpiresAt?: Date | null;
  consentExpiresAt?: Date | null;
  rawData?: Record<string, unknown>;
};

export type ConnectedProviderAccount = {
  provider: string;
  providerAccountId: string | null;
  providerAccessTokenEnc: string | null;
  providerRefreshTokenEnc: string | null;
  providerTokenExpiresAt: Date | null;
  providerLastSyncCursor: Date | null;
  currency: string;
};

export type BankFeedProvider = {
  key: string;
  label: string;
  importTransactions(input: {
    bankAccountId: string;
    transactions?: ProviderTransactionInput[];
    account?: ConnectedProviderAccount;
  }): Promise<ProviderTransactionInput[]>;
  buildLinkUrl?(input: { state: string }): string;
  exchangeCallback?(input: { code: string }): Promise<ProviderLinkedAccount[]>;
  refreshAccessToken?(input: {
    refreshTokenEnc: string;
  }): Promise<{
    accessTokenEnc: string;
    refreshTokenEnc?: string | null;
    tokenExpiresAt?: Date | null;
  }>;
};

function getTrueLayerBaseUrl() {
  if (process.env.BANK_PROVIDER_BASE_URL) {
    return process.env.BANK_PROVIDER_BASE_URL;
  }

  return process.env.BANK_PROVIDER_ENV === "live"
    ? "https://api.truelayer.com"
    : "https://api.truelayer-sandbox.com";
}

function getTrueLayerAuthBaseUrl() {
  if (process.env.BANK_PROVIDER_AUTH_BASE_URL) {
    return process.env.BANK_PROVIDER_AUTH_BASE_URL;
  }

  return "https://auth.truelayer.com";
}

function getTrueLayerRedirectUri() {
  const redirectUri = process.env.BANK_PROVIDER_REDIRECT_URI;

  if (!redirectUri) {
    throw new Error("BANK_PROVIDER_REDIRECT_URI is required for provider linking.");
  }

  return redirectUri;
}

function getTrueLayerCredentials() {
  const clientId = process.env.BANK_PROVIDER_CLIENT_ID;
  const clientSecret = process.env.BANK_PROVIDER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("BANK_PROVIDER_CLIENT_ID and BANK_PROVIDER_CLIENT_SECRET are required.");
  }

  return { clientId, clientSecret };
}

async function trueLayerFetchJson<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${getTrueLayerBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`TrueLayer request failed: ${response.status} ${text}`);
  }

  return (await response.json()) as T;
}

function mapTrueLayerAccount(account: Record<string, unknown>, accessToken: string, refreshToken?: string | null) {
  const displayName = String(account.display_name ?? account.account_type ?? "Linked bank account");
  const number = typeof account.account_number === "object" && account.account_number
    ? (account.account_number as Record<string, unknown>)
    : null;

  return {
    providerAccountId: String(account.account_id ?? account.id ?? ""),
    name: displayName,
    institutionName:
      typeof account.provider === "object" && account.provider
        ? String((account.provider as Record<string, unknown>).display_name ?? "")
        : null,
    accountMask: number?.number ? String(number.number).slice(-4) : null,
    currency: String(account.currency ?? "GBP"),
    accessTokenEnc: encryptSecret(accessToken),
    refreshTokenEnc: refreshToken ? encryptSecret(refreshToken) : null,
    tokenExpiresAt:
      typeof account.access_token_expires_at === "string"
        ? new Date(String(account.access_token_expires_at))
        : null,
    consentExpiresAt:
      typeof account.update_timestamp === "string"
        ? new Date(String(account.update_timestamp))
        : null,
    rawData: account
  } satisfies ProviderLinkedAccount;
}

function mapTrueLayerTransaction(record: Record<string, unknown>): ProviderTransactionInput {
  const amount = Number(record.amount ?? 0);
  const transactionId = String(record.transaction_id ?? record.id ?? "");
  const merchantName = typeof record.merchant_name === "string" ? record.merchant_name : null;
  const description =
    String(record.description ?? merchantName ?? record.transaction_type ?? "Bank transaction");

  return {
    externalTransactionId: transactionId || undefined,
    bookedAt: new Date(String(record.timestamp ?? record.booking_date_time ?? record.booking_date)),
    valueDate: record.value_date ? new Date(String(record.value_date)) : null,
    amount: amount.toFixed(2),
    currency: String(record.currency ?? "GBP"),
    description,
    counterparty: merchantName,
    reference: typeof record.reference === "string" ? record.reference : null,
    rawData: record
  };
}

export const manualImportProvider: BankFeedProvider = {
  key: "manual",
  label: "Manual Import Stub",
  async importTransactions(input) {
    return input.transactions ?? [];
  }
};

export const trueLayerProvider: BankFeedProvider = {
  key: "truelayer",
  label: "TrueLayer",
  buildLinkUrl({ state }) {
    const { clientId } = getTrueLayerCredentials();
    const url = new URL(getTrueLayerAuthBaseUrl());

    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", getTrueLayerRedirectUri());
    url.searchParams.set("scope", "accounts transactions balance offline_access");
    url.searchParams.set("providers", "uk-ob-all");
    url.searchParams.set("state", state);
    if (process.env.BANK_PROVIDER_ENV === "sandbox") {
      url.searchParams.set("enable_mock", "true");
    }

    return url.toString();
  },
  async exchangeCallback({ code }) {
    const { clientId, clientSecret } = getTrueLayerCredentials();
    const tokenResponse = await trueLayerFetchJson<{
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    }>("/connect/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: getTrueLayerRedirectUri(),
        code
      }).toString()
    });

    const accountsResponse = await trueLayerFetchJson<{ results?: Record<string, unknown>[] }>("/data/v1/accounts", {
      headers: {
        Authorization: `Bearer ${tokenResponse.access_token}`
      }
    });

    const tokenExpiresAt = tokenResponse.expires_in
      ? new Date(Date.now() + tokenResponse.expires_in * 1000)
      : null;

    return (accountsResponse.results ?? []).map((account) => ({
      ...mapTrueLayerAccount(account, tokenResponse.access_token, tokenResponse.refresh_token ?? null),
      tokenExpiresAt
    }));
  },
  async refreshAccessToken({ refreshTokenEnc }) {
    const { clientId, clientSecret } = getTrueLayerCredentials();
    const refreshToken = decryptSecret(refreshTokenEnc);
    const tokenResponse = await trueLayerFetchJson<{
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    }>("/connect/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken
      }).toString()
    });

    return {
      accessTokenEnc: encryptSecret(tokenResponse.access_token),
      refreshTokenEnc: tokenResponse.refresh_token ? encryptSecret(tokenResponse.refresh_token) : refreshTokenEnc,
      tokenExpiresAt: tokenResponse.expires_in
        ? new Date(Date.now() + tokenResponse.expires_in * 1000)
        : null
    };
  },
  async importTransactions(input) {
    if (!input.account?.providerAccessTokenEnc || !input.account.providerAccountId) {
      throw new Error("Connected provider account details are required.");
    }

    const accessToken = decryptSecret(input.account.providerAccessTokenEnc);
    const from = input.account.providerLastSyncCursor
      ? new Date(input.account.providerLastSyncCursor.getTime() - 7 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const to = new Date();
    const path = `/data/v1/accounts/${input.account.providerAccountId}/transactions?from=${encodeURIComponent(
      from.toISOString()
    )}&to=${encodeURIComponent(to.toISOString())}`;

    const response = await trueLayerFetchJson<{ results?: Record<string, unknown>[] }>(path, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    return (response.results ?? []).map(mapTrueLayerTransaction);
  }
};

const providerRegistry: Record<string, BankFeedProvider> = {
  manual: manualImportProvider,
  truelayer: trueLayerProvider
};

export function getBankFeedProvider(key: string) {
  return providerRegistry[key] ?? manualImportProvider;
}

export function listBankFeedProviders() {
  return Object.values(providerRegistry);
}
