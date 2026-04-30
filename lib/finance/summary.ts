import { Prisma } from "@prisma/client";

export type FinancialYearRange = {
  start: Date;
  end: Date;
  startYear: number;
};

export function getCurrentMonthRange(now = new Date()) {
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 1)
  };
}

export function getFinancialYearStartYear(now = new Date()) {
  const year = now.getFullYear();
  const fyStartThisYear = new Date(year, 3, 6);

  return now >= fyStartThisYear ? year : year - 1;
}

export function getFinancialYearRange(startYear: number): FinancialYearRange {
  return {
    start: new Date(startYear, 3, 6),
    end: new Date(startYear + 1, 3, 6),
    startYear
  };
}

export function getCurrentFinancialYearRange(now = new Date()) {
  return getFinancialYearRange(getFinancialYearStartYear(now));
}

export function formatFinancialYearLabel(startYear: number) {
  const endYearShort = String(startYear + 1).slice(-2);
  return `FY ${startYear}/${endYearShort}`;
}

export function isCurrentFinancialYear(startYear: number, now = new Date()) {
  return getFinancialYearStartYear(now) === startYear;
}

export function getFinancialYearMonthBuckets(startYear: number) {
  return Array.from({ length: 12 }, (_, index) => {
    const start = new Date(startYear, 3 + index, 6);
    const end = new Date(startYear, 4 + index, 6);

    return {
      index,
      label: start.toLocaleString("en-GB", { month: "short" }),
      start,
      end
    };
  });
}

export function getFinancialYearAvailableMonths(startYear: number, now = new Date()) {
  if (!isCurrentFinancialYear(startYear, now)) {
    return 12;
  }

  return getFinancialYearMonthBuckets(startYear).filter((bucket) => bucket.start <= now).length;
}

export function parseFinancialYearStartYear(
  value: string | number | undefined | null,
  fallback = getFinancialYearStartYear()
) {
  const numeric = typeof value === "number" ? value : Number(value);

  if (!Number.isInteger(numeric) || numeric < 2000 || numeric > 3000) {
    return fallback;
  }

  return numeric;
}

export function sumDecimalLike(values: Array<Prisma.Decimal | string | number>) {
  return values.reduce((sum, value) => {
    const numeric =
      value instanceof Prisma.Decimal ? value.toNumber() : typeof value === "string" ? Number(value) : value;
    return sum + numeric;
  }, 0);
}
