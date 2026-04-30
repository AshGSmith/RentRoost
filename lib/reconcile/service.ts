import {
  BankConnectionStatus,
  BankTransactionStatus,
  Prisma
} from "@prisma/client";
import { z } from "zod";

import { createAuditLog } from "@/lib/auth/audit";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import {
  createExpense,
  createIncome,
  getCashflowReferenceData
} from "@/lib/finance/service";
import {
  bankAccountSchema,
  manualTransactionSchema,
  reconcileExpenseSchema,
  reconcileIncomeSchema,
  reconciliationRuleSchema,
  userAutoReconcileSchema,
  type BankAccountInput,
  type ManualTransactionInput,
  type ReconcileExpenseInput,
  type ReconcileIncomeInput,
  type ReconciliationRuleInput,
  type UserAutoReconcileInput
} from "@/lib/reconcile/validation";
import {
  getBankFeedProvider,
  type ConnectedProviderAccount,
  type ProviderTransactionInput
} from "@/lib/reconcile/providers";

export class ReconcileError extends Error {
  fieldErrors?: Record<string, string[]>;

  constructor(message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "ReconcileError";
    this.fieldErrors = fieldErrors;
  }
}

type ReconcileContext = {
  tenantUserId: string;
  actorUserId: string;
};

function validationErrorFromZod(error: z.ZodError) {
  const fieldErrors = error.issues.reduce<Record<string, string[]>>((acc, issue) => {
    const key = issue.path.join(".") || "form";
    acc[key] = [...(acc[key] ?? []), issue.message];
    return acc;
  }, {});

  return new ReconcileError("Please review the highlighted fields.", fieldErrors);
}

function ensureDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    throw new ReconcileError("A valid date is required.");
  }
  return date;
}

function normalizeDescription(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function toDecimal(value: string) {
  return new Prisma.Decimal(value);
}

function encodeLinkState(payload: Record<string, unknown>) {
  return encryptSecret(JSON.stringify(payload));
}

function decodeLinkState(state: string) {
  try {
    const parsed = JSON.parse(decryptSecret(state)) as {
      bankAccountId: string;
      tenantUserId: string;
      actorUserId: string;
      createdAt: string;
    };
    const createdAt = new Date(parsed.createdAt);

    if (Number.isNaN(createdAt.valueOf()) || Date.now() - createdAt.getTime() > 30 * 60 * 1000) {
      throw new ReconcileError("Bank linking session has expired.");
    }

    return parsed;
  } catch (error) {
    if (error instanceof ReconcileError) {
      throw error;
    }
    throw new ReconcileError("Bank linking state is invalid.");
  }
}

async function assertOwnedBankAccount(id: string, userId: string) {
  const account = await prisma.bankAccount.findFirst({
    where: { id, userId }
  });

  if (!account) {
    throw new ReconcileError("Bank account not found.");
  }

  return account;
}

async function assertLinkedBankAccount(id: string, userId: string) {
  const account = await assertOwnedBankAccount(id, userId);

  if (account.provider === "manual") {
    throw new ReconcileError("Manual accounts do not support live provider sync.");
  }

  if (!account.providerAccountId || !account.providerAccessTokenEnc) {
    throw new ReconcileError("Connect this provider account before syncing.");
  }

  return account;
}

async function assertOwnedTransaction(id: string, userId: string) {
  const transaction = await prisma.bankTransaction.findFirst({
    where: { id, userId },
    include: {
      bankAccount: true
    }
  });

  if (!transaction) {
    throw new ReconcileError("Transaction not found.");
  }

  return transaction;
}

async function assertOwnedRule(id: string, userId: string) {
  const rule = await prisma.reconciliationRule.findFirst({
    where: { id, userId }
  });

  if (!rule) {
    throw new ReconcileError("Rule not found.");
  }

  return rule;
}

async function assertOwnedCategory(
  id: string,
  userId: string,
  type: "INCOME" | "EXPENSE"
) {
  const category = await prisma.cashflowCategory.findFirst({
    where: {
      id,
      userId,
      type
    }
  });

  if (!category) {
    throw new ReconcileError("Category not found.");
  }

  return category;
}

async function assertOwnedTenancy(id: string | undefined, userId: string) {
  if (!id) return null;

  const tenancy = await prisma.tenancyAgreement.findFirst({
    where: {
      id,
      userId
    }
  });

  if (!tenancy) {
    throw new ReconcileError("Tenancy not found.");
  }

  return tenancy;
}

async function getEffectiveAutoReconcileSettings(userId: string, bankAccountId?: string) {
  const settings = await prisma.userSettings.findUnique({
    where: { userId }
  });

  const account = bankAccountId
    ? await prisma.bankAccount.findFirst({
        where: { id: bankAccountId, userId }
      })
    : null;

  return {
    enabled: account?.autoReconciliationEnabled ?? settings?.autoReconciliationEnabled ?? false,
    minConfidence:
      account?.autoReconciliationMinConfidence ?? settings?.autoReconciliationMinConfidence ?? 85
  };
}

async function refreshProviderTokensIfNeeded(account: ConnectedProviderAccount & { id: string; userId: string }) {
  if (account.provider === "manual") {
    return account;
  }

  const provider = getBankFeedProvider(account.provider);

  if (
    !account.providerAccessTokenEnc ||
    !account.providerRefreshTokenEnc ||
    !provider.refreshAccessToken ||
    (account.providerTokenExpiresAt && account.providerTokenExpiresAt > new Date(Date.now() + 60 * 1000))
  ) {
    return account;
  }

  const refreshed = await provider.refreshAccessToken({
    refreshTokenEnc: account.providerRefreshTokenEnc
  });

  return prisma.bankAccount.update({
    where: { id: account.id },
    data: {
      providerAccessTokenEnc: refreshed.accessTokenEnc,
      providerRefreshTokenEnc: refreshed.refreshTokenEnc ?? account.providerRefreshTokenEnc,
      providerTokenExpiresAt: refreshed.tokenExpiresAt ?? account.providerTokenExpiresAt,
      connectionStatus: BankConnectionStatus.CONNECTED,
      lastSyncError: null
    }
  });
}

function scoreRuleMatch(input: {
  normalizedDescription: string;
  amount: Prisma.Decimal;
  counterparty?: string | null;
  rule: {
    normalizedDescription: string;
    amount: Prisma.Decimal | null;
    counterparty: string | null;
  };
}) {
  let score = 0;

  if (input.rule.normalizedDescription === input.normalizedDescription) {
    score += 60;
  } else if (input.normalizedDescription.includes(input.rule.normalizedDescription)) {
    score += 40;
  }

  if (input.rule.amount && input.rule.amount.equals(input.amount.abs())) {
    score += 25;
  }

  if (
    input.counterparty &&
    input.rule.counterparty &&
    input.counterparty.toLowerCase() === input.rule.counterparty.toLowerCase()
  ) {
    score += 15;
  }

  return Math.min(score, 100);
}

async function suggestRuleForTransaction(transactionId: string, userId: string) {
  const transaction = await prisma.bankTransaction.findFirst({
    where: { id: transactionId, userId },
    include: {
      bankAccount: true
    }
  });

  if (!transaction) {
    throw new ReconcileError("Transaction not found.");
  }

  const rules = await prisma.reconciliationRule.findMany({
    where: {
      userId,
      enabled: true,
      OR: [{ bankAccountId: null }, { bankAccountId: transaction.bankAccountId }]
    },
    orderBy: [{ updatedAt: "desc" }]
  });

  let best: { ruleId: string; confidence: number } | null = null;

  for (const rule of rules) {
    const confidence = scoreRuleMatch({
      normalizedDescription: transaction.normalizedDescription,
      amount: transaction.amount,
      counterparty: transaction.counterparty,
      rule
    });

    if (!best || confidence > best.confidence) {
      best = { ruleId: rule.id, confidence };
    }
  }

  await prisma.bankTransaction.update({
    where: { id: transaction.id },
    data: {
      suggestedRuleId: best?.ruleId ?? null,
      confidenceScore: best?.confidence ?? null
    }
  });

  return best;
}

async function maybeAutoReconcileTransaction(transactionId: string, userId: string) {
  const transaction = await prisma.bankTransaction.findFirst({
    where: { id: transactionId, userId },
    include: { bankAccount: true }
  });

  if (!transaction || transaction.status !== "REVIEW") {
    return;
  }

  const suggestion = await suggestRuleForTransaction(transaction.id, userId);

  if (!suggestion?.ruleId) {
    return;
  }

  const rule = await prisma.reconciliationRule.findFirst({
    where: { id: suggestion.ruleId, userId }
  });

  if (!rule || !rule.autoApply) {
    return;
  }

  const settings = await getEffectiveAutoReconcileSettings(userId, transaction.bankAccountId);

  if (!settings.enabled || suggestion.confidence < settings.minConfidence) {
    return;
  }

  if (rule.type === "INCOME") {
    await reconcileTransactionAsIncome(
      transaction.id,
      {
        categoryId: rule.categoryId,
        tenancyAgreementId: rule.tenancyAgreementId ?? undefined,
        amount: transaction.amount.abs().toString(),
        paymentDate: transaction.bookedAt.toISOString(),
        notes: rule.incomeNotes ?? undefined,
        saveRule: false,
        ruleAutoApply: false
      },
      { tenantUserId: userId, actorUserId: userId },
      { skipSuggestionRefresh: true }
    );
  } else {
    await reconcileTransactionAsExpense(
      transaction.id,
      {
        categoryId: rule.categoryId,
        tenancyAgreementId: rule.tenancyAgreementId ?? undefined,
        grossAmount: transaction.amount.abs().toString(),
        removeVat: rule.removeVat,
        description: rule.expenseDescription ?? transaction.description,
        invoiceNumber: undefined,
        dueDate: transaction.bookedAt.toISOString(),
        supplier: rule.supplier ?? transaction.counterparty ?? "Imported counterparty",
        paid: rule.paid,
        organisationExpense: rule.organisationExpense,
        saveRule: false,
        ruleAutoApply: false
      },
      { tenantUserId: userId, actorUserId: userId },
      { skipSuggestionRefresh: true }
    );
  }
}

export async function listBankAccounts(userId: string) {
  return prisma.bankAccount.findMany({
    where: { userId },
    include: {
      _count: {
        select: {
          transactions: true,
          reconciliationRules: true
        }
      }
    },
    orderBy: [{ name: "asc" }]
  });
}

export async function getBankAccount(userId: string, id: string) {
  return prisma.bankAccount.findFirst({
    where: { id, userId },
    include: {
      _count: {
        select: {
          transactions: true,
          reconciliationRules: true
        }
      }
    }
  });
}

export async function listBankAccountTransactions(
  userId: string,
  bankAccountId: string,
  status: BankTransactionStatus
) {
  return prisma.bankTransaction.findMany({
    where: {
      userId,
      bankAccountId,
      status
    },
    include: {
      suggestedRule: true,
      income: {
        include: {
          category: true,
          tenancyAgreement: {
            include: { property: true }
          }
        }
      },
      expense: {
        include: {
          category: true,
          tenancyAgreement: {
            include: { property: true }
          }
        }
      }
    },
    orderBy: [{ bookedAt: "desc" }, { createdAt: "desc" }]
  });
}

export async function getBankTransaction(userId: string, id: string) {
  return prisma.bankTransaction.findFirst({
    where: {
      id,
      userId
    },
    include: {
      bankAccount: true,
      suggestedRule: {
        include: {
          category: true,
          tenancyAgreement: {
            include: {
              property: true
            }
          }
        }
      },
      income: {
        include: {
          category: true,
          tenancyAgreement: {
            include: {
              property: true
            }
          }
        }
      },
      expense: {
        include: {
          category: true,
          tenancyAgreement: {
            include: {
              property: true
            }
          }
        }
      }
    }
  });
}

export async function listReconciliationRules(userId: string, bankAccountId?: string) {
  return prisma.reconciliationRule.findMany({
    where: {
      userId,
      ...(bankAccountId ? { OR: [{ bankAccountId }, { bankAccountId: null }] } : {})
    },
    include: {
      category: true,
      tenancyAgreement: {
        include: { property: true }
      }
    },
    orderBy: [{ updatedAt: "desc" }]
  });
}

export async function getReconciliationRule(userId: string, id: string) {
  return prisma.reconciliationRule.findFirst({
    where: {
      id,
      userId
    }
  });
}

export async function getReconcileReferenceData(userId: string) {
  const [financeRefs, settings] = await Promise.all([
    getCashflowReferenceData(userId),
    prisma.userSettings.findUnique({ where: { userId } })
  ]);

  return {
    ...financeRefs,
    userAutoReconciliationEnabled: settings?.autoReconciliationEnabled ?? false,
    userAutoReconciliationMinConfidence: settings?.autoReconciliationMinConfidence ?? 85
  };
}

export async function createBankAccount(data: unknown, context: ReconcileContext) {
  const parsed = bankAccountSchema.safeParse(data);
  if (!parsed.success) throw validationErrorFromZod(parsed.error);

  const account = await prisma.bankAccount.create({
    data: {
      userId: context.tenantUserId,
      ...parsed.data,
      connectionStatus:
        parsed.data.provider === "manual"
          ? BankConnectionStatus.CONNECTED
          : BankConnectionStatus.DISCONNECTED
    }
  });

  await createAuditLog({
    action: "bank_account.created",
    entityType: "BankAccount",
    entityId: account.id,
    userId: context.tenantUserId,
    actorUserId: context.actorUserId
  });

  return account;
}

export async function updateBankAccount(id: string, data: unknown, context: ReconcileContext) {
  const parsed = bankAccountSchema.safeParse(data);
  if (!parsed.success) throw validationErrorFromZod(parsed.error);

  await assertOwnedBankAccount(id, context.tenantUserId);

  const account = await prisma.bankAccount.update({
    where: { id },
    data: {
      ...parsed.data,
      ...(parsed.data.provider === "manual"
        ? {
            connectionStatus: BankConnectionStatus.CONNECTED
          }
        : {})
    }
  });

  return account;
}

export async function deleteBankAccount(id: string, context: ReconcileContext) {
  await assertOwnedBankAccount(id, context.tenantUserId);
  await prisma.bankAccount.delete({ where: { id } });
}

export async function updateUserAutoReconcileSettings(data: unknown, context: ReconcileContext) {
  const parsed = userAutoReconcileSchema.safeParse(data);
  if (!parsed.success) throw validationErrorFromZod(parsed.error);

  await prisma.userSettings.upsert({
    where: { userId: context.tenantUserId },
    update: parsed.data,
    create: {
      userId: context.tenantUserId,
      theme: "LIGHT",
      currencyDesignator: "£",
      ...parsed.data
    }
  });
}

async function persistImportedTransaction(
  bankAccountId: string,
  userId: string,
  input: ProviderTransactionInput
) {
  const normalizedDescription = normalizeDescription(input.description);
  const existing = input.externalTransactionId
    ? await prisma.bankTransaction.findFirst({
        where: {
          userId,
          bankAccountId,
          externalTransactionId: input.externalTransactionId
        }
      })
    : null;

  if (existing) {
    return existing;
  }

  const created = await prisma.bankTransaction.create({
    data: {
      userId,
      bankAccountId,
      externalTransactionId: input.externalTransactionId,
      bookedAt: input.bookedAt,
      valueDate: input.valueDate ?? null,
      amount: toDecimal(input.amount),
      currency: input.currency ?? "GBP",
      description: input.description,
      normalizedDescription,
      counterparty: input.counterparty ?? null,
      reference: input.reference ?? null,
      rawData: input.rawData
    }
  });

  await createAuditLog({
    action: "bank_transaction.imported",
    entityType: "BankTransaction",
    entityId: created.id,
    userId,
    actorUserId: userId
  });

  return created;
}

export async function manualImportTransactions(
  bankAccountId: string,
  inputs: ManualTransactionInput[],
  context: ReconcileContext
) {
  const account = await assertOwnedBankAccount(bankAccountId, context.tenantUserId);
  const provider = getBankFeedProvider(account.provider);
  const prepared = inputs.map((input) => ({
    externalTransactionId: input.externalTransactionId,
    bookedAt: ensureDate(input.bookedAt),
    valueDate: input.valueDate ? ensureDate(input.valueDate) : null,
    amount: input.amount,
    currency: input.currency,
    description: input.description,
    counterparty: input.counterparty,
    reference: input.reference,
    rawData: {
      source: "manual-import"
    }
  }));

  const providerTransactions = await provider.importTransactions({
    bankAccountId,
    transactions: prepared
  });

  const created: { id: string }[] = [];

  for (const item of providerTransactions) {
    const transaction = await persistImportedTransaction(bankAccountId, context.tenantUserId, item);
    created.push({ id: transaction.id });
    await maybeAutoReconcileTransaction(transaction.id, context.tenantUserId);
  }

  return created;
}

export async function buildBankAccountLinkUrl(
  bankAccountId: string,
  context: ReconcileContext
) {
  const account = await assertOwnedBankAccount(bankAccountId, context.tenantUserId);
  const provider = getBankFeedProvider(account.provider);

  if (!provider.buildLinkUrl) {
    throw new ReconcileError("This provider does not support secure account linking.");
  }

  const state = encodeLinkState({
    bankAccountId: account.id,
    tenantUserId: context.tenantUserId,
    actorUserId: context.actorUserId,
    createdAt: new Date().toISOString()
  });

  await prisma.bankAccount.update({
    where: { id: account.id },
    data: {
      connectionStatus: BankConnectionStatus.PENDING,
      lastSyncError: null
    }
  });

  return provider.buildLinkUrl({ state });
}

export async function completeBankAccountLink(
  providerKey: string,
  code: string,
  state: string
) {
  const provider = getBankFeedProvider(providerKey);

  if (!provider.exchangeCallback) {
    throw new ReconcileError("This provider does not support callback exchange.");
  }

  const parsedState = decodeLinkState(state);
  const baseAccount = await assertOwnedBankAccount(parsedState.bankAccountId, parsedState.tenantUserId);
  const linkedAccounts = await provider.exchangeCallback({ code });

  if (linkedAccounts.length === 0) {
    throw new ReconcileError("No provider accounts were returned from the bank link.");
  }

  const savedAccounts: { id: string }[] = [];

  for (const [index, linked] of linkedAccounts.entries()) {
    const existing = await prisma.bankAccount.findFirst({
      where: {
        userId: parsedState.tenantUserId,
        provider: providerKey,
        providerAccountId: linked.providerAccountId
      }
    });

    const targetId = existing?.id ?? (index === 0 ? baseAccount.id : crypto.randomUUID());
    const account = await prisma.bankAccount.upsert({
      where: { id: targetId },
      update: {
        name: linked.name,
        institutionName: linked.institutionName ?? baseAccount.institutionName,
        accountMask: linked.accountMask,
        currency: linked.currency,
        provider: providerKey,
        providerAccountId: linked.providerAccountId,
        providerAccessTokenEnc: linked.accessTokenEnc,
        providerRefreshTokenEnc: linked.refreshTokenEnc ?? null,
        providerTokenExpiresAt: linked.tokenExpiresAt ?? null,
        providerConsentExpiresAt: linked.consentExpiresAt ?? null,
        connectionStatus: BankConnectionStatus.CONNECTED,
        lastSyncError: null
      },
      create: {
        id: targetId,
        userId: parsedState.tenantUserId,
        name: linked.name,
        institutionName: linked.institutionName ?? baseAccount.institutionName,
        accountMask: linked.accountMask,
        currency: linked.currency,
        provider: providerKey,
        providerAccountId: linked.providerAccountId,
        providerAccessTokenEnc: linked.accessTokenEnc,
        providerRefreshTokenEnc: linked.refreshTokenEnc ?? null,
        providerTokenExpiresAt: linked.tokenExpiresAt ?? null,
        providerConsentExpiresAt: linked.consentExpiresAt ?? null,
        connectionStatus: BankConnectionStatus.CONNECTED,
        autoReconciliationEnabled: baseAccount.autoReconciliationEnabled,
        autoReconciliationMinConfidence: baseAccount.autoReconciliationMinConfidence
      }
    });

    savedAccounts.push({ id: account.id });

    await createAuditLog({
      action: "bank_account.linked",
      entityType: "BankAccount",
      entityId: account.id,
      userId: parsedState.tenantUserId,
      actorUserId: parsedState.actorUserId,
      metadata: linked.rawData ?? null
    });
  }

  return savedAccounts;
}

export async function syncBankAccountTransactions(
  bankAccountId: string,
  context: ReconcileContext,
  options?: { actorUserId?: string | null; reason?: string }
) {
  const owned = await assertLinkedBankAccount(bankAccountId, context.tenantUserId);
  const provider = getBankFeedProvider(owned.provider);
  const refreshedAccount = await refreshProviderTokensIfNeeded(owned as ConnectedProviderAccount & { id: string; userId: string });

  await prisma.bankAccount.update({
    where: { id: owned.id },
    data: {
      lastSyncAttemptAt: new Date(),
      lastSyncError: null
    }
  });

  try {
    const imported = await provider.importTransactions({
      bankAccountId: owned.id,
      account: refreshedAccount as ConnectedProviderAccount
    });

    const created: { id: string }[] = [];
    let latestBookedAt: Date | null = refreshedAccount.providerLastSyncCursor;

    for (const item of imported) {
      const transaction = await persistImportedTransaction(owned.id, context.tenantUserId, item);
      created.push({ id: transaction.id });
      latestBookedAt =
        !latestBookedAt || transaction.bookedAt > latestBookedAt ? transaction.bookedAt : latestBookedAt;
      await maybeAutoReconcileTransaction(transaction.id, context.tenantUserId);
    }

    await prisma.bankAccount.update({
      where: { id: owned.id },
      data: {
        connectionStatus: BankConnectionStatus.CONNECTED,
        lastSyncedAt: new Date(),
        lastSyncError: null,
        providerLastSyncCursor: latestBookedAt ?? refreshedAccount.providerLastSyncCursor
      }
    });

    await createAuditLog({
      action: "bank_account.synced",
      entityType: "BankAccount",
      entityId: owned.id,
      userId: context.tenantUserId,
      actorUserId: options?.actorUserId ?? context.actorUserId,
      metadata: {
        reason: options?.reason ?? "manual",
        importedTransactions: created.length
      }
    });

    return {
      importedCount: created.length,
      transactionIds: created.map((item) => item.id)
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error";

    await prisma.bankAccount.update({
      where: { id: owned.id },
      data: {
        connectionStatus: BankConnectionStatus.ERROR,
        lastSyncError: message
      }
    });

    await createAuditLog({
      action: "bank_account.sync_failed",
      entityType: "BankAccount",
      entityId: owned.id,
      userId: context.tenantUserId,
      actorUserId: options?.actorUserId ?? context.actorUserId,
      metadata: {
        reason: options?.reason ?? "manual",
        error: message
      }
    });

    throw new ReconcileError(message);
  }
}

export async function syncAllConnectedBankAccounts(options?: {
  userId?: string;
  actorUserId?: string | null;
  reason?: string;
}) {
  const accounts = await prisma.bankAccount.findMany({
    where: {
      ...(options?.userId ? { userId: options.userId } : {}),
      provider: {
        not: "manual"
      },
      connectionStatus: {
        in: [BankConnectionStatus.CONNECTED, BankConnectionStatus.ERROR]
      }
    },
    select: {
      id: true,
      userId: true
    }
  });

  const results: Array<{ bankAccountId: string; status: "synced" | "failed"; importedCount?: number; error?: string }> = [];

  for (const account of accounts) {
    try {
      const result = await syncBankAccountTransactions(
        account.id,
        {
          tenantUserId: account.userId,
          actorUserId: options?.actorUserId ?? account.userId
        },
        {
          actorUserId: options?.actorUserId ?? account.userId,
          reason: options?.reason ?? "scheduled"
        }
      );
      results.push({ bankAccountId: account.id, status: "synced", importedCount: result.importedCount });
    } catch (error) {
      results.push({
        bankAccountId: account.id,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown sync error"
      });
    }
  }

  return {
    processed: results.length,
    results
  };
}

export async function createManualTransaction(
  bankAccountId: string,
  data: unknown,
  context: ReconcileContext
) {
  const parsed = manualTransactionSchema.safeParse(data);
  if (!parsed.success) throw validationErrorFromZod(parsed.error);

  const [created] = await manualImportTransactions(bankAccountId, [parsed.data], context);
  return assertOwnedTransaction(created.id, context.tenantUserId);
}

export async function createReconciliationRule(
  bankAccountId: string | undefined,
  data: unknown,
  context: ReconcileContext
) {
  const parsed = reconciliationRuleSchema.safeParse(data);
  if (!parsed.success) throw validationErrorFromZod(parsed.error);

  if (bankAccountId) {
    await assertOwnedBankAccount(bankAccountId, context.tenantUserId);
  }

  await assertOwnedCategory(parsed.data.categoryId, context.tenantUserId, parsed.data.type);
  await assertOwnedTenancy(parsed.data.tenancyAgreementId || undefined, context.tenantUserId);

  const rule = await prisma.reconciliationRule.create({
    data: {
      userId: context.tenantUserId,
      bankAccountId: bankAccountId ?? null,
      ...parsed.data,
      amount: parsed.data.amount ? toDecimal(parsed.data.amount) : null,
      organisationExpense: parsed.data.organisationExpense ?? false,
      removeVat: parsed.data.removeVat ?? false,
      paid: parsed.data.paid ?? true,
      enabled: parsed.data.enabled ?? true,
      autoApply: parsed.data.autoApply ?? true
    }
  });

  return rule;
}

export async function updateReconciliationRule(
  id: string,
  data: unknown,
  context: ReconcileContext
) {
  const parsed = reconciliationRuleSchema.safeParse(data);
  if (!parsed.success) throw validationErrorFromZod(parsed.error);

  const existing = await assertOwnedRule(id, context.tenantUserId);

  if (existing.bankAccountId) {
    await assertOwnedBankAccount(existing.bankAccountId, context.tenantUserId);
  }

  await assertOwnedCategory(parsed.data.categoryId, context.tenantUserId, parsed.data.type);
  await assertOwnedTenancy(parsed.data.tenancyAgreementId || undefined, context.tenantUserId);

  return prisma.reconciliationRule.update({
    where: { id },
    data: {
      ...parsed.data,
      amount: parsed.data.amount ? toDecimal(parsed.data.amount) : null,
      organisationExpense: parsed.data.organisationExpense ?? false,
      removeVat: parsed.data.removeVat ?? false,
      paid: parsed.data.paid ?? true,
      enabled: parsed.data.enabled ?? true,
      autoApply: parsed.data.autoApply ?? true
    }
  });
}

export async function deleteReconciliationRule(id: string, context: ReconcileContext) {
  await assertOwnedRule(id, context.tenantUserId);
  await prisma.reconciliationRule.delete({ where: { id } });
}

async function maybeCreateRuleFromIncomeReconciliation(
  transaction: Awaited<ReturnType<typeof assertOwnedTransaction>>,
  input: ReconcileIncomeInput,
  context: ReconcileContext
) {
  if (!input.saveRule) return null;

  return createReconciliationRule(
    transaction.bankAccountId,
    {
      name: `Income match for ${transaction.description}`,
      type: "INCOME",
      normalizedDescription: transaction.normalizedDescription,
      amount: transaction.amount.abs().toString(),
      counterparty: transaction.counterparty ?? undefined,
      categoryId: input.categoryId,
      tenancyAgreementId: input.tenancyAgreementId,
      incomeNotes: input.notes,
      enabled: true,
      autoApply: input.ruleAutoApply ?? false
    },
    context
  );
}

async function maybeCreateRuleFromExpenseReconciliation(
  transaction: Awaited<ReturnType<typeof assertOwnedTransaction>>,
  input: ReconcileExpenseInput,
  context: ReconcileContext
) {
  if (!input.saveRule) return null;

  return createReconciliationRule(
    transaction.bankAccountId,
    {
      name: `Expense match for ${transaction.description}`,
      type: "EXPENSE",
      normalizedDescription: transaction.normalizedDescription,
      amount: transaction.amount.abs().toString(),
      counterparty: transaction.counterparty ?? input.supplier,
      categoryId: input.categoryId,
      tenancyAgreementId: input.organisationExpense ? undefined : input.tenancyAgreementId,
      organisationExpense: input.organisationExpense ?? false,
      supplier: input.supplier,
      expenseDescription: input.description,
      removeVat: input.removeVat ?? false,
      paid: input.paid ?? true,
      enabled: true,
      autoApply: input.ruleAutoApply ?? false
    },
    context
  );
}

export async function reconcileTransactionAsIncome(
  transactionId: string,
  data: unknown,
  context: ReconcileContext,
  options?: { skipSuggestionRefresh?: boolean }
) {
  const parsed = reconcileIncomeSchema.safeParse(data);
  if (!parsed.success) throw validationErrorFromZod(parsed.error);

  const transaction = await assertOwnedTransaction(transactionId, context.tenantUserId);
  if (transaction.status !== "REVIEW") throw new ReconcileError("Only review transactions can be reconciled.");

  const income = await createIncome(
    {
      categoryId: parsed.data.categoryId,
      tenancyAgreementId: parsed.data.tenancyAgreementId,
      amount: parsed.data.amount,
      paymentDate: parsed.data.paymentDate,
      notes: parsed.data.notes
    },
    { tenantUserId: context.tenantUserId, actorUserId: context.actorUserId }
  );

  const updatedIncome = await prisma.incomeEntry.update({
    where: { id: income.id },
    data: {
      bankTransactionId: transaction.id
    }
  });

  await prisma.bankTransaction.update({
    where: { id: transaction.id },
    data: {
      status: "RECONCILED",
      reconciliationType: "INCOME",
      reconciledAt: new Date()
    }
  });

  await maybeCreateRuleFromIncomeReconciliation(transaction, parsed.data, context);

  if (!options?.skipSuggestionRefresh) {
    await suggestRuleForTransaction(transaction.id, context.tenantUserId);
  }

  return updatedIncome;
}

export async function reconcileTransactionAsExpense(
  transactionId: string,
  data: unknown,
  context: ReconcileContext,
  options?: { skipSuggestionRefresh?: boolean }
) {
  const parsed = reconcileExpenseSchema.safeParse(data);
  if (!parsed.success) throw validationErrorFromZod(parsed.error);

  const transaction = await assertOwnedTransaction(transactionId, context.tenantUserId);
  if (transaction.status !== "REVIEW") throw new ReconcileError("Only review transactions can be reconciled.");

  const expense = await createExpense(
    {
      categoryId: parsed.data.categoryId,
      tenancyAgreementId: parsed.data.organisationExpense ? undefined : parsed.data.tenancyAgreementId,
      grossAmount: parsed.data.grossAmount,
      removeVat: parsed.data.removeVat ?? false,
      description: parsed.data.description,
      invoiceNumber: parsed.data.invoiceNumber,
      dueDate: parsed.data.dueDate,
      supplier: parsed.data.supplier,
      paid: parsed.data.paid ?? true,
      organisationExpense: parsed.data.organisationExpense ?? false
    },
    { tenantUserId: context.tenantUserId, actorUserId: context.actorUserId }
  );

  const updatedExpense = await prisma.expenseEntry.update({
    where: { id: expense.id },
    data: {
      bankTransactionId: transaction.id
    }
  });

  await prisma.bankTransaction.update({
    where: { id: transaction.id },
    data: {
      status: "RECONCILED",
      reconciliationType: "EXPENSE",
      reconciledAt: new Date()
    }
  });

  await maybeCreateRuleFromExpenseReconciliation(transaction, parsed.data, context);

  if (!options?.skipSuggestionRefresh) {
    await suggestRuleForTransaction(transaction.id, context.tenantUserId);
  }

  return updatedExpense;
}

export async function ignoreTransaction(transactionId: string, context: ReconcileContext) {
  const transaction = await assertOwnedTransaction(transactionId, context.tenantUserId);

  return prisma.bankTransaction.update({
    where: { id: transaction.id },
    data: {
      status: "IGNORED",
      ignoredAt: new Date()
    }
  });
}

export async function applySuggestedRule(transactionId: string, context: ReconcileContext) {
  const transaction = await assertOwnedTransaction(transactionId, context.tenantUserId);
  const suggestion = await suggestRuleForTransaction(transaction.id, context.tenantUserId);

  if (!suggestion?.ruleId) {
    throw new ReconcileError("No suggested rule found for this transaction.");
  }

  const rule = await assertOwnedRule(suggestion.ruleId, context.tenantUserId);

  if (rule.type === "INCOME") {
    return reconcileTransactionAsIncome(
      transaction.id,
      {
        categoryId: rule.categoryId,
        tenancyAgreementId: rule.tenancyAgreementId ?? undefined,
        amount: transaction.amount.abs().toString(),
        paymentDate: transaction.bookedAt.toISOString(),
        notes: rule.incomeNotes ?? undefined,
        saveRule: false,
        ruleAutoApply: false
      },
      context
    );
  }

  return reconcileTransactionAsExpense(
    transaction.id,
    {
      categoryId: rule.categoryId,
      tenancyAgreementId: rule.tenancyAgreementId ?? undefined,
      grossAmount: transaction.amount.abs().toString(),
      removeVat: rule.removeVat,
      description: rule.expenseDescription ?? transaction.description,
      invoiceNumber: undefined,
      dueDate: transaction.bookedAt.toISOString(),
      supplier: rule.supplier ?? transaction.counterparty ?? "Imported counterparty",
      paid: rule.paid,
      organisationExpense: rule.organisationExpense,
      saveRule: false,
      ruleAutoApply: false
    },
    context
  );
}

export function parseBankAccountInput(formData: FormData): BankAccountInput {
  return {
    name: String(formData.get("name") ?? ""),
    institutionName: String(formData.get("institutionName") ?? ""),
    accountMask: String(formData.get("accountMask") ?? ""),
    currency: String(formData.get("currency") ?? "GBP"),
    provider: String(formData.get("provider") ?? "manual"),
    autoReconciliationEnabled: formData.get("autoReconciliationEnabled") === "on",
    autoReconciliationMinConfidence: Number(formData.get("autoReconciliationMinConfidence") ?? 85)
  };
}

export function parseManualTransactionInput(formData: FormData): ManualTransactionInput {
  return {
    bookedAt: String(formData.get("bookedAt") ?? ""),
    valueDate: String(formData.get("valueDate") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    currency: String(formData.get("currency") ?? "GBP"),
    description: String(formData.get("description") ?? ""),
    counterparty: String(formData.get("counterparty") ?? ""),
    reference: String(formData.get("reference") ?? ""),
    externalTransactionId: String(formData.get("externalTransactionId") ?? "")
  };
}

export function parseUserAutoReconcileInput(formData: FormData): UserAutoReconcileInput {
  return {
    autoReconciliationEnabled: formData.get("autoReconciliationEnabled") === "on",
    autoReconciliationMinConfidence: Number(formData.get("autoReconciliationMinConfidence") ?? 85)
  };
}

export function parseRuleInput(formData: FormData): ReconciliationRuleInput {
  return {
    name: String(formData.get("name") ?? ""),
    type: String(formData.get("type") ?? "") as "INCOME" | "EXPENSE",
    normalizedDescription: normalizeDescription(String(formData.get("normalizedDescription") ?? "")),
    amount: String(formData.get("amount") ?? ""),
    counterparty: String(formData.get("counterparty") ?? ""),
    categoryId: String(formData.get("categoryId") ?? ""),
    tenancyAgreementId: String(formData.get("tenancyAgreementId") ?? ""),
    organisationExpense: formData.get("organisationExpense") === "on",
    supplier: String(formData.get("supplier") ?? ""),
    expenseDescription: String(formData.get("expenseDescription") ?? ""),
    incomeNotes: String(formData.get("incomeNotes") ?? ""),
    removeVat: formData.get("removeVat") === "on",
    paid: formData.get("paid") === "on",
    enabled: formData.get("enabled") !== "off",
    autoApply: formData.get("autoApply") === "on"
  };
}

export function parseReconcileIncomeInput(formData: FormData): ReconcileIncomeInput {
  return {
    categoryId: String(formData.get("categoryId") ?? ""),
    tenancyAgreementId: String(formData.get("tenancyAgreementId") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    paymentDate: String(formData.get("paymentDate") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    saveRule: formData.get("saveRule") === "on",
    ruleAutoApply: formData.get("ruleAutoApply") === "on"
  };
}

export function parseReconcileExpenseInput(formData: FormData): ReconcileExpenseInput {
  return {
    categoryId: String(formData.get("categoryId") ?? ""),
    tenancyAgreementId: String(formData.get("tenancyAgreementId") ?? ""),
    grossAmount: String(formData.get("grossAmount") ?? ""),
    removeVat: formData.get("removeVat") === "on",
    description: String(formData.get("description") ?? ""),
    invoiceNumber: String(formData.get("invoiceNumber") ?? ""),
    dueDate: String(formData.get("dueDate") ?? ""),
    supplier: String(formData.get("supplier") ?? ""),
    paid: formData.get("paid") === "on",
    organisationExpense: formData.get("organisationExpense") === "on",
    saveRule: formData.get("saveRule") === "on",
    ruleAutoApply: formData.get("ruleAutoApply") === "on"
  };
}
