import { Prisma } from "@prisma/client";
import { z } from "zod";

import { createAuditLog } from "@/lib/auth/audit";
import { prisma } from "@/lib/prisma";
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from "@/lib/finance/defaults";
import { getCurrentFinancialYearRange, getCurrentMonthRange, sumDecimalLike } from "@/lib/finance/summary";
import { categorySchema, expenseSchema, incomeSchema, type CategoryInput, type ExpenseInput, type IncomeInput } from "@/lib/finance/validation";

export class FinanceError extends Error {
  fieldErrors?: Record<string, string[]>;

  constructor(message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "FinanceError";
    this.fieldErrors = fieldErrors;
  }
}

type FinanceContext = {
  tenantUserId: string;
  actorUserId: string;
};

function validationErrorFromZod(error: z.ZodError) {
  const fieldErrors = error.issues.reduce<Record<string, string[]>>((acc, issue) => {
    const key = issue.path.join(".") || "form";
    acc[key] = [...(acc[key] ?? []), issue.message];
    return acc;
  }, {});

  return new FinanceError("Please review the highlighted fields.", fieldErrors);
}

function toDecimal(value: string) {
  return new Prisma.Decimal(value);
}

function ensureDate(value: string, fieldName: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    throw new FinanceError(`${fieldName} is invalid.`, { [fieldName]: [`${fieldName} is invalid.`] });
  }
  return date;
}

function computeExpenseVat(grossAmount: string, removeVat: boolean) {
  const gross = Number(grossAmount);

  if (!removeVat) {
    return {
      grossAmount: toDecimal(grossAmount),
      netAmount: toDecimal(grossAmount),
      vatAmount: new Prisma.Decimal(0)
    };
  }

  const net = gross / 1.2;
  const vat = gross - net;

  return {
    grossAmount: toDecimal(gross.toFixed(2)),
    netAmount: toDecimal(net.toFixed(2)),
    vatAmount: toDecimal(vat.toFixed(2))
  };
}

export async function ensureDefaultCashflowCategories(userId: string) {
  await Promise.all(
    DEFAULT_INCOME_CATEGORIES.map((name) =>
      prisma.cashflowCategory.upsert({
        where: {
          userId_type_name: {
            userId,
            type: "INCOME",
            name
          }
        },
        update: {
          isDefault: true
        },
        create: {
          userId,
          type: "INCOME",
          name,
          isDefault: true
        }
      })
    )
  );

  await Promise.all(
    DEFAULT_EXPENSE_CATEGORIES.map((name) =>
      prisma.cashflowCategory.upsert({
        where: {
          userId_type_name: {
            userId,
            type: "EXPENSE",
            name
          }
        },
        update: {
          isDefault: true
        },
        create: {
          userId,
          type: "EXPENSE",
          name,
          isDefault: true
        }
      })
    )
  );
}

async function assertOwnedCategory(id: string, type: "INCOME" | "EXPENSE", userId: string) {
  const category = await prisma.cashflowCategory.findFirst({
    where: {
      id,
      userId,
      type
    }
  });

  if (!category) {
    throw new FinanceError("Category not found.");
  }

  return category;
}

async function assertOwnedTenancy(id: string | undefined, userId: string) {
  if (!id) {
    return null;
  }

  const tenancy = await prisma.tenancyAgreement.findFirst({
    where: {
      id,
      userId
    }
  });

  if (!tenancy) {
    throw new FinanceError("Tenancy not found.");
  }

  return tenancy;
}

async function assertOwnedIncome(id: string, userId: string) {
  const income = await prisma.incomeEntry.findFirst({
    where: { id, userId }
  });

  if (!income) {
    throw new FinanceError("Income entry not found.");
  }

  return income;
}

async function assertOwnedExpense(id: string, userId: string) {
  const expense = await prisma.expenseEntry.findFirst({
    where: { id, userId }
  });

  if (!expense) {
    throw new FinanceError("Expense entry not found.");
  }

  return expense;
}

export async function listCashflowCategories(userId: string, type?: "INCOME" | "EXPENSE") {
  await ensureDefaultCashflowCategories(userId);

  return prisma.cashflowCategory.findMany({
    where: {
      userId,
      ...(type ? { type } : {})
    },
    orderBy: [{ type: "asc" }, { name: "asc" }]
  });
}

export async function createCashflowCategory(data: unknown, context: FinanceContext) {
  const parsed = categorySchema.safeParse(data);
  if (!parsed.success) {
    throw validationErrorFromZod(parsed.error);
  }

  const category = await prisma.cashflowCategory.create({
    data: {
      userId: context.tenantUserId,
      name: parsed.data.name,
      type: parsed.data.type,
      isDefault: false
    }
  });

  await createAuditLog({
    action: "cashflow_category.created",
    entityType: "CashflowCategory",
    entityId: category.id,
    userId: context.tenantUserId,
    actorUserId: context.actorUserId
  });

  return category;
}

export async function deleteCashflowCategory(id: string, context: FinanceContext) {
  const category = await prisma.cashflowCategory.findFirst({
    where: { id, userId: context.tenantUserId }
  });

  if (!category) {
    throw new FinanceError("Category not found.");
  }

  const usage =
    category.type === "INCOME"
      ? await prisma.incomeEntry.count({ where: { categoryId: category.id, userId: context.tenantUserId } })
      : await prisma.expenseEntry.count({ where: { categoryId: category.id, userId: context.tenantUserId } });

  if (usage > 0) {
    throw new FinanceError("This category is already in use and cannot be deleted.");
  }

  await prisma.cashflowCategory.delete({ where: { id: category.id } });
}

export async function listIncomeEntries(userId: string) {
  await ensureDefaultCashflowCategories(userId);

  return prisma.incomeEntry.findMany({
    where: { userId },
    include: {
      category: true,
      tenancyAgreement: {
        include: { property: true }
      }
    },
    orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }]
  });
}

export async function listExpenseEntries(userId: string) {
  await ensureDefaultCashflowCategories(userId);

  return prisma.expenseEntry.findMany({
    where: { userId },
    include: {
      category: true,
      tenancyAgreement: {
        include: { property: true }
      }
    },
    orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }]
  });
}

export async function getIncomeEntry(userId: string, id: string) {
  return prisma.incomeEntry.findFirst({
    where: { id, userId },
    include: {
      category: true,
      tenancyAgreement: {
        include: { property: true }
      }
    }
  });
}

export async function getExpenseEntry(userId: string, id: string) {
  return prisma.expenseEntry.findFirst({
    where: { id, userId },
    include: {
      category: true,
      tenancyAgreement: {
        include: { property: true }
      }
    }
  });
}

export async function createIncome(data: unknown, context: FinanceContext) {
  const parsed = incomeSchema.safeParse(data);
  if (!parsed.success) {
    throw validationErrorFromZod(parsed.error);
  }

  await assertOwnedCategory(parsed.data.categoryId, "INCOME", context.tenantUserId);
  await assertOwnedTenancy(parsed.data.tenancyAgreementId, context.tenantUserId);

  const income = await prisma.incomeEntry.create({
    data: {
      userId: context.tenantUserId,
      categoryId: parsed.data.categoryId,
      tenancyAgreementId: parsed.data.tenancyAgreementId ?? null,
      amount: toDecimal(parsed.data.amount),
      paymentDate: ensureDate(parsed.data.paymentDate, "paymentDate"),
      notes: parsed.data.notes
    }
  });

  await createAuditLog({
    action: "income.created",
    entityType: "IncomeEntry",
    entityId: income.id,
    userId: context.tenantUserId,
    actorUserId: context.actorUserId
  });

  return income;
}

export async function updateIncome(id: string, data: unknown, context: FinanceContext) {
  const parsed = incomeSchema.safeParse(data);
  if (!parsed.success) {
    throw validationErrorFromZod(parsed.error);
  }

  await assertOwnedIncome(id, context.tenantUserId);
  await assertOwnedCategory(parsed.data.categoryId, "INCOME", context.tenantUserId);
  await assertOwnedTenancy(parsed.data.tenancyAgreementId, context.tenantUserId);

  const income = await prisma.incomeEntry.update({
    where: { id },
    data: {
      categoryId: parsed.data.categoryId,
      tenancyAgreementId: parsed.data.tenancyAgreementId ?? null,
      amount: toDecimal(parsed.data.amount),
      paymentDate: ensureDate(parsed.data.paymentDate, "paymentDate"),
      notes: parsed.data.notes
    }
  });

  return income;
}

export async function deleteIncome(id: string, context: FinanceContext) {
  await assertOwnedIncome(id, context.tenantUserId);
  await prisma.incomeEntry.delete({ where: { id } });
}

export async function createExpense(data: unknown, context: FinanceContext) {
  const parsed = expenseSchema.safeParse(data);
  if (!parsed.success) {
    throw validationErrorFromZod(parsed.error);
  }

  await assertOwnedCategory(parsed.data.categoryId, "EXPENSE", context.tenantUserId);
  await assertOwnedTenancy(parsed.data.tenancyAgreementId, context.tenantUserId);

  const amounts = computeExpenseVat(parsed.data.grossAmount, parsed.data.removeVat);

  const expense = await prisma.expenseEntry.create({
    data: {
      userId: context.tenantUserId,
      categoryId: parsed.data.categoryId,
      tenancyAgreementId: parsed.data.organisationExpense ? null : parsed.data.tenancyAgreementId ?? null,
      grossAmount: amounts.grossAmount,
      netAmount: amounts.netAmount,
      vatAmount: amounts.vatAmount,
      removeVat: parsed.data.removeVat,
      description: parsed.data.description,
      invoiceNumber: parsed.data.invoiceNumber,
      dueDate: ensureDate(parsed.data.dueDate, "dueDate"),
      supplier: parsed.data.supplier,
      paid: parsed.data.paid,
      organisationExpense: parsed.data.organisationExpense
    }
  });

  return expense;
}

export async function updateExpense(id: string, data: unknown, context: FinanceContext) {
  const parsed = expenseSchema.safeParse(data);
  if (!parsed.success) {
    throw validationErrorFromZod(parsed.error);
  }

  await assertOwnedExpense(id, context.tenantUserId);
  await assertOwnedCategory(parsed.data.categoryId, "EXPENSE", context.tenantUserId);
  await assertOwnedTenancy(parsed.data.tenancyAgreementId, context.tenantUserId);

  const amounts = computeExpenseVat(parsed.data.grossAmount, parsed.data.removeVat);

  const expense = await prisma.expenseEntry.update({
    where: { id },
    data: {
      categoryId: parsed.data.categoryId,
      tenancyAgreementId: parsed.data.organisationExpense ? null : parsed.data.tenancyAgreementId ?? null,
      grossAmount: amounts.grossAmount,
      netAmount: amounts.netAmount,
      vatAmount: amounts.vatAmount,
      removeVat: parsed.data.removeVat,
      description: parsed.data.description,
      invoiceNumber: parsed.data.invoiceNumber,
      dueDate: ensureDate(parsed.data.dueDate, "dueDate"),
      supplier: parsed.data.supplier,
      paid: parsed.data.paid,
      organisationExpense: parsed.data.organisationExpense
    }
  });

  return expense;
}

export async function deleteExpense(id: string, context: FinanceContext) {
  await assertOwnedExpense(id, context.tenantUserId);
  await prisma.expenseEntry.delete({ where: { id } });
}

export async function getCashflowReferenceData(userId: string) {
  await ensureDefaultCashflowCategories(userId);

  const [incomeCategories, expenseCategories, tenancies] = await Promise.all([
    prisma.cashflowCategory.findMany({
      where: { userId, type: "INCOME" },
      orderBy: { name: "asc" }
    }),
    prisma.cashflowCategory.findMany({
      where: { userId, type: "EXPENSE" },
      orderBy: { name: "asc" }
    }),
    prisma.tenancyAgreement.findMany({
      where: { userId },
      include: {
        property: true
      },
      orderBy: [{ startDate: "desc" }]
    })
  ]);

  return { incomeCategories, expenseCategories, tenancies };
}

export async function calculateCashflowSummaries(userId: string) {
  const [incomes, expenses] = await Promise.all([listIncomeEntries(userId), listExpenseEntries(userId)]);
  const monthRange = getCurrentMonthRange();
  const financialYearRange = getCurrentFinancialYearRange();

  return {
    income: {
      monthToDate: sumDecimalLike(
        incomes.filter((entry) => entry.paymentDate >= monthRange.start && entry.paymentDate < monthRange.end).map((entry) => entry.amount)
      ),
      yearToDate: sumDecimalLike(
        incomes
          .filter((entry) => entry.paymentDate >= financialYearRange.start && entry.paymentDate < financialYearRange.end)
          .map((entry) => entry.amount)
      )
    },
    expense: {
      monthToDate: sumDecimalLike(
        expenses.filter((entry) => entry.dueDate >= monthRange.start && entry.dueDate < monthRange.end).map((entry) => entry.grossAmount)
      ),
      yearToDate: sumDecimalLike(
        expenses
          .filter((entry) => entry.dueDate >= financialYearRange.start && entry.dueDate < financialYearRange.end)
          .map((entry) => entry.grossAmount)
      )
    }
  };
}

export function parseCategoryInput(formData: FormData): CategoryInput {
  return {
    name: String(formData.get("name") ?? ""),
    type: String(formData.get("type") ?? "") as "INCOME" | "EXPENSE"
  };
}

export function parseIncomeInput(formData: FormData): IncomeInput {
  return {
    categoryId: String(formData.get("categoryId") ?? ""),
    tenancyAgreementId: String(formData.get("tenancyAgreementId") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    paymentDate: String(formData.get("paymentDate") ?? ""),
    notes: String(formData.get("notes") ?? "")
  };
}

export function parseExpenseInput(formData: FormData): ExpenseInput {
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
    organisationExpense: formData.get("organisationExpense") === "on"
  };
}
