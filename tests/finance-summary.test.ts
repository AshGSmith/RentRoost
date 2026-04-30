import test from "node:test";
import assert from "node:assert/strict";

import {
  formatFinancialYearLabel,
  getCurrentFinancialYearRange,
  getFinancialYearAvailableMonths,
  getFinancialYearRange,
  parseFinancialYearStartYear
} from "@/lib/finance/summary";

test("financial year starts on 6 April", () => {
  const beforeStart = getCurrentFinancialYearRange(new Date("2026-04-05T12:00:00Z"));
  const afterStart = getCurrentFinancialYearRange(new Date("2026-04-06T12:00:00Z"));

  assert.equal(beforeStart.start.toISOString().slice(0, 10), "2025-04-06");
  assert.equal(afterStart.start.toISOString().slice(0, 10), "2026-04-06");
});

test("formats financial year labels", () => {
  assert.equal(formatFinancialYearLabel(2025), "FY 2025/26");
});

test("returns full 12 months for historic years and partial months for current year", () => {
  assert.equal(getFinancialYearAvailableMonths(2024, new Date("2026-02-01T12:00:00Z")), 12);
  assert.equal(getFinancialYearAvailableMonths(2025, new Date("2026-02-01T12:00:00Z")), 10);
});

test("parses and validates financial year start year", () => {
  assert.equal(parseFinancialYearStartYear("2027", 2025), 2027);
  assert.equal(parseFinancialYearStartYear("not-a-year", 2025), 2025);
});

test("builds exact financial year range", () => {
  const range = getFinancialYearRange(2025);

  assert.equal(range.start.toISOString().slice(0, 10), "2025-04-06");
  assert.equal(range.end.toISOString().slice(0, 10), "2026-04-06");
});
