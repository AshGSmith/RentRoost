import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  formatFinancialYearLabel,
  getCurrentMonthRange,
  getFinancialYearAvailableMonths,
  getFinancialYearMonthBuckets,
  getFinancialYearRange,
  getFinancialYearStartYear,
  sumDecimalLike
} from "@/lib/finance/summary";

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getMonthPaymentDate(now: Date, paymentDay: number) {
  return new Date(now.getFullYear(), now.getMonth(), Math.min(paymentDay, daysInMonth(now.getFullYear(), now.getMonth())));
}

function getCurrentRentAmount(tenancy: {
  rentChanges: { amount: Prisma.Decimal; effectiveDate: Date }[];
}) {
  const today = new Date();
  const effectiveRent =
    tenancy.rentChanges.find((change) => change.effectiveDate <= today) ?? tenancy.rentChanges[0] ?? null;

  return effectiveRent?.amount.toNumber() ?? 0;
}

export function getOrganisationLogoDataUrl(organisation?: {
  logoData?: Uint8Array | null;
  logoMimeType?: string | null;
}) {
  if (!organisation?.logoData || !organisation.logoMimeType) {
    return null;
  }

  return `data:${organisation.logoMimeType};base64,${Buffer.from(organisation.logoData).toString("base64")}`;
}

export async function getDashboardMetrics(userId: string, selectedFinancialYearStartYear = getFinancialYearStartYear()) {
  const now = new Date();
  const monthRange = getCurrentMonthRange(now);
  const selectedYearRange = getFinancialYearRange(selectedFinancialYearStartYear);
  const remindersHorizon = addDays(now, 60);

  const [monthRentIncome, activeTenancies, upcomingReminders, yearIncomeEntries, yearExpenseEntries] =
    await Promise.all([
      prisma.incomeEntry.findMany({
        where: {
          userId,
          paymentDate: {
            gte: monthRange.start,
            lt: monthRange.end
          },
          category: {
            name: "Rent"
          }
        },
        include: {
          tenancyAgreement: true
        }
      }),
      prisma.tenancyAgreement.findMany({
        where: {
          userId,
          startDate: {
            lte: now
          },
          OR: [
            { endDate: null },
            { endDate: { gte: now } }
          ]
        },
        include: {
          rentChanges: {
            orderBy: [{ effectiveDate: "desc" }, { createdAt: "desc" }]
          }
        }
      }),
      prisma.reminder.findMany({
        where: {
          userId,
          isComplete: false,
          dueDate: {
            gte: now,
            lte: endOfDay(remindersHorizon)
          }
        },
        include: {
          property: true,
          tenancyAgreement: {
            include: {
              property: true
            }
          }
        },
        orderBy: [{ dueDate: "asc" }, { reminderAt: "asc" }]
      }),
      prisma.incomeEntry.findMany({
        where: {
          userId,
          paymentDate: {
            gte: selectedYearRange.start,
            lt: selectedYearRange.end
          }
        }
      }),
      prisma.expenseEntry.findMany({
        where: {
          userId,
          dueDate: {
            gte: selectedYearRange.start,
            lt: selectedYearRange.end
          }
        }
      })
    ]);

  const rentReceivedThisMonth = sumDecimalLike(monthRentIncome.map((entry) => entry.amount));

  const rentIncomeByTenancy = monthRentIncome.reduce<Record<string, number>>((acc, entry) => {
    if (!entry.tenancyAgreementId) return acc;
    acc[entry.tenancyAgreementId] = (acc[entry.tenancyAgreementId] ?? 0) + entry.amount.toNumber();
    return acc;
  }, {});

  const rentOverdue = activeTenancies.reduce((sum, tenancy) => {
    const currentRent = getCurrentRentAmount(tenancy);
    if (!currentRent) return sum;

    const paymentDate = getMonthPaymentDate(now, tenancy.paymentDay);
    if (paymentDate > now) return sum;

    const received = rentIncomeByTenancy[tenancy.id] ?? 0;
    return sum + Math.max(currentRent - received, 0);
  }, 0);

  const monthsAvailable = getFinancialYearAvailableMonths(selectedFinancialYearStartYear, now);
  const cashflowSeries = getFinancialYearMonthBuckets(selectedFinancialYearStartYear)
    .slice(0, monthsAvailable)
    .map((bucket) => ({
      label: bucket.label,
      income: sumDecimalLike(
        yearIncomeEntries
          .filter((entry) => entry.paymentDate >= bucket.start && entry.paymentDate < bucket.end)
          .map((entry) => entry.amount)
      ),
      expense: sumDecimalLike(
        yearExpenseEntries
          .filter((entry) => entry.dueDate >= bucket.start && entry.dueDate < bucket.end)
          .map((entry) => entry.grossAmount)
      )
    }));

  return {
    selectedFinancialYearStartYear,
    selectedFinancialYearLabel: formatFinancialYearLabel(selectedFinancialYearStartYear),
    rentReceivedThisMonth,
    rentOverdue,
    upcomingReminders: upcomingReminders.map((reminder) => {
      const daysUntilDue = Math.ceil((reminder.dueDate.getTime() - now.getTime()) / 86400000);

      return {
        ...reminder,
        urgency: daysUntilDue <= 30 ? "red" : "amber"
      } as const;
    }),
    cashflowSeries
  };
}

export async function getFinancialYearReportData(
  userId: string,
  selectedFinancialYearStartYear = getFinancialYearStartYear()
) {
  const range = getFinancialYearRange(selectedFinancialYearStartYear);
  const [settings, organisation, incomes, expenses] = await Promise.all([
    prisma.userSettings.findUnique({
      where: {
        userId
      }
    }),
    prisma.organisationSettings.findUnique({
      where: {
        userId
      }
    }),
    prisma.incomeEntry.findMany({
      where: {
        userId,
        paymentDate: {
          gte: range.start,
          lt: range.end
        }
      },
      include: {
        category: true,
        tenancyAgreement: {
          include: {
            property: true
          }
        }
      },
      orderBy: [{ paymentDate: "asc" }, { createdAt: "asc" }]
    }),
    prisma.expenseEntry.findMany({
      where: {
        userId,
        dueDate: {
          gte: range.start,
          lt: range.end
        }
      },
      include: {
        category: true,
        tenancyAgreement: {
          include: {
            property: true
          }
        }
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }]
    })
  ]);

  const totalIncome = sumDecimalLike(incomes.map((entry) => entry.amount));
  const totalExpense = sumDecimalLike(expenses.map((entry) => entry.grossAmount));
  const tenancyLinkedIncome = sumDecimalLike(
    incomes.filter((entry) => entry.tenancyAgreementId).map((entry) => entry.amount)
  );
  const otherIncome = sumDecimalLike(
    incomes.filter((entry) => !entry.tenancyAgreementId).map((entry) => entry.amount)
  );
  const tenancyLinkedExpense = sumDecimalLike(
    expenses.filter((entry) => entry.tenancyAgreementId).map((entry) => entry.grossAmount)
  );
  const organisationExpense = sumDecimalLike(
    expenses.filter((entry) => entry.organisationExpense).map((entry) => entry.grossAmount)
  );

  const monthlySeries = getFinancialYearMonthBuckets(selectedFinancialYearStartYear).map((bucket) => ({
    label: bucket.label,
    income: sumDecimalLike(
      incomes.filter((entry) => entry.paymentDate >= bucket.start && entry.paymentDate < bucket.end).map((entry) => entry.amount)
    ),
    expense: sumDecimalLike(
      expenses.filter((entry) => entry.dueDate >= bucket.start && entry.dueDate < bucket.end).map((entry) => entry.grossAmount)
    )
  }));

  return {
    selectedFinancialYearStartYear,
    selectedFinancialYearLabel: formatFinancialYearLabel(selectedFinancialYearStartYear),
    range,
    currencyDesignator: settings?.currencyDesignator ?? "£",
    organisation,
    organisationLogoDataUrl: getOrganisationLogoDataUrl(organisation),
    totals: {
      income: totalIncome,
      expense: totalExpense,
      net: totalIncome - totalExpense,
      tenancyLinkedIncome,
      otherIncome,
      tenancyLinkedExpense,
      organisationExpense
    },
    monthlySeries,
    incomes,
    expenses
  };
}

export type FinancialYearReportData = Awaited<ReturnType<typeof getFinancialYearReportData>>;

export function getFinancialYearOptions(count = 5) {
  const currentStartYear = getFinancialYearStartYear();

  return Array.from({ length: count }, (_, index) => {
    const startYear = currentStartYear - index;

    return {
      startYear,
      label: formatFinancialYearLabel(startYear)
    };
  });
}
