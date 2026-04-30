import { NextResponse } from "next/server";

import { getTenantContext } from "@/lib/auth/tenant";
import { parseFinancialYearStartYear } from "@/lib/finance/summary";
import { buildFinancialYearPdf } from "@/lib/reports/pdf";
import { getFinancialYearReportData } from "@/lib/reports/service";

export async function GET(request: Request) {
  const { tenantUserId } = await getTenantContext();
  const { searchParams } = new URL(request.url);
  const year = parseFinancialYearStartYear(searchParams.get("year"));
  const report = await getFinancialYearReportData(tenantUserId, year);
  const pdf = buildFinancialYearPdf(report);

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="rentroost-${year}-financial-year-report.pdf"`
    }
  });
}
