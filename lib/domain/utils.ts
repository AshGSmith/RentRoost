import { Prisma } from "@prisma/client";

export function addYears(date: Date, years: number) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

export function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function addWeeks(date: Date, weeks: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + weeks * 7);
  return next;
}

export function toDecimal(value: string) {
  return new Prisma.Decimal(value);
}

export function formatCurrency(amount: Prisma.Decimal | number | string, currencyDesignator = "£") {
  const numericValue =
    amount instanceof Prisma.Decimal ? amount.toNumber() : typeof amount === "string" ? Number(amount) : amount;

  return `${currencyDesignator}${numericValue.toFixed(2)}`;
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) {
    return "Not set";
  }

  const actualDate = typeof date === "string" ? new Date(date) : date;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(actualDate);
}

export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) {
    return "Not set";
  }

  const actualDate = typeof date === "string" ? new Date(date) : date;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(actualDate);
}

export function computeNextPaymentDate(paymentDay: number, now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const candidate = new Date(year, month, 1);
  candidate.setDate(Math.min(paymentDay, daysInMonth(year, month)));

  if (candidate < startOfDay(now)) {
    const nextMonth = new Date(year, month + 1, 1);
    nextMonth.setDate(Math.min(paymentDay, daysInMonth(nextMonth.getFullYear(), nextMonth.getMonth())));
    return nextMonth;
  }

  return candidate;
}

export function buildRentReviewReminderDateTime(dueDate: Date) {
  const reminderAt = new Date(dueDate);
  reminderAt.setDate(reminderAt.getDate() - 30);
  reminderAt.setHours(12, 0, 0, 0);
  return reminderAt;
}

export function advanceRecurringDate(date: Date, frequency: "WEEKLY" | "MONTHLY" | "ANNUAL") {
  if (frequency === "WEEKLY") {
    return addWeeks(date, 1);
  }

  if (frequency === "MONTHLY") {
    return addMonths(date, 1);
  }

  return addYears(date, 1);
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
