import { formatDate } from "@/lib/domain/utils";
import { type FinancialYearReportData } from "@/lib/reports/service";

type EmbeddedImage =
  | {
      kind: "jpeg";
      width: number;
      height: number;
      objectBody: Buffer;
    }
  | {
      kind: "png";
      width: number;
      height: number;
      colorSpace: "DeviceRGB" | "DeviceGray";
      objectBody: Buffer;
    };

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN_X = 42;
const HEADER_HEIGHT = 82;
const FOOTER_HEIGHT = 28;
const BODY_TOP = PAGE_HEIGHT - 118;
const BODY_BOTTOM = 54;
const LINE_HEIGHT = 14;

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function truncate(value: string, max = 28) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function wrapText(value: string, maxCharacters = 90) {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxCharacters && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.length ? lines : [""];
}

function getJpegDimensions(buffer: Buffer) {
  let offset = 2;

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);

    if ([0xc0, 0xc1, 0xc2, 0xc3].includes(marker)) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7)
      };
    }

    offset += 2 + length;
  }

  throw new Error("Unsupported JPEG image.");
}

function parsePng(buffer: Buffer): EmbeddedImage {
  const signature = buffer.subarray(0, 8);
  const expected = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  if (!signature.equals(expected)) {
    throw new Error("Invalid PNG signature.");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 8;
  let colorType = 2;
  const idatChunks: Buffer[] = [];

  while (offset < buffer.length) {
    const chunkLength = buffer.readUInt32BE(offset);
    const chunkType = buffer.toString("ascii", offset + 4, offset + 8);
    const chunkData = buffer.subarray(offset + 8, offset + 8 + chunkLength);

    if (chunkType === "IHDR") {
      width = chunkData.readUInt32BE(0);
      height = chunkData.readUInt32BE(4);
      bitDepth = chunkData[8];
      colorType = chunkData[9];
    }

    if (chunkType === "IDAT") {
      idatChunks.push(chunkData);
    }

    if (chunkType === "IEND") {
      break;
    }

    offset += chunkLength + 12;
  }

  if (bitDepth !== 8 || ![0, 2].includes(colorType)) {
    throw new Error("Only 8-bit grayscale or RGB PNG logos are supported in PDF export.");
  }

  const colors = colorType === 2 ? 3 : 1;
  const colorSpace = colorType === 2 ? "DeviceRGB" : "DeviceGray";
  const data = Buffer.concat(idatChunks);
  const objectBody = Buffer.from(
    `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /${colorSpace} /BitsPerComponent 8 /Filter /FlateDecode /DecodeParms << /Predictor 15 /Colors ${colors} /BitsPerComponent 8 /Columns ${width} >> /Length ${data.length} >>\nstream\n`,
    "binary"
  );

  return {
    kind: "png",
    width,
    height,
    colorSpace,
    objectBody: Buffer.concat([objectBody, data, Buffer.from("\nendstream", "binary")])
  };
}

function parseLogoImage(
  logoData?: Uint8Array | null,
  logoMimeType?: string | null
): EmbeddedImage | null {
  if (!logoData || !logoMimeType) return null;

  try {
    const buffer = Buffer.from(logoData);

    if (logoMimeType === "image/jpeg" || logoMimeType === "image/jpg") {
      const dimensions = getJpegDimensions(buffer);

      return {
        kind: "jpeg",
        width: dimensions.width,
        height: dimensions.height,
        objectBody: Buffer.concat([
          Buffer.from(
            `<< /Type /XObject /Subtype /Image /Width ${dimensions.width} /Height ${dimensions.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${buffer.length} >>\nstream\n`,
            "binary"
          ),
          buffer,
          Buffer.from("\nendstream", "binary")
        ])
      };
    }

    if (logoMimeType === "image/png") {
      return parsePng(buffer);
    }
  } catch {
    return null;
  }

  return null;
}

function formatAmount(amount: number, currencyDesignator: string) {
  return `${currencyDesignator}${amount.toFixed(2)}`;
}

export function buildFinancialYearPdf(report: FinancialYearReportData) {
  const embeddedLogo = parseLogoImage(report.organisation?.logoData, report.organisation?.logoMimeType);
  const pages: string[] = [];
  let currentPage = "";
  let cursorY = BODY_TOP;
  let pageNumber = 0;

  function flushPage() {
    if (currentPage) {
      pages.push(currentPage);
      currentPage = "";
    }
  }

  function startPage() {
    flushPage();
    pageNumber += 1;
    cursorY = BODY_TOP;
    currentPage += [
      "0.16 0.39 0.89 rg",
      `0 ${PAGE_HEIGHT - HEADER_HEIGHT} ${PAGE_WIDTH} ${HEADER_HEIGHT} re f`,
      "1 1 1 rg",
      "BT",
      "/F2 19 Tf",
      `${MARGIN_X} ${PAGE_HEIGHT - 42} Td`,
      `(${escapePdfText(report.organisation?.organisationName ?? "RentRoost")}) Tj`,
      "ET",
      "BT",
      "/F1 10 Tf",
      `${MARGIN_X} ${PAGE_HEIGHT - 60} Td`,
      `(${escapePdfText(`Financial Year Report · ${report.selectedFinancialYearLabel}`)}) Tj`,
      "ET"
    ].join("\n");

    if (embeddedLogo && pageNumber === 1) {
      const targetWidth = 92;
      const targetHeight = (embeddedLogo.height / embeddedLogo.width) * targetWidth;
      const x = PAGE_WIDTH - MARGIN_X - targetWidth;
      const y = PAGE_HEIGHT - 62 - targetHeight;
      currentPage += `\nq\n${targetWidth} 0 0 ${targetHeight} ${x} ${y} cm\n/Im1 Do\nQ`;
    }

    currentPage += [
      "\n0.15 0.23 0.42 rg",
      `BT /F1 9 Tf ${MARGIN_X} ${FOOTER_HEIGHT - 6} Td (${escapePdfText(report.selectedFinancialYearLabel)}) Tj ET`,
      `BT /F1 9 Tf ${PAGE_WIDTH - 86} ${FOOTER_HEIGHT - 6} Td (${escapePdfText(`Page ${pageNumber}`)}) Tj ET`,
      "0 g"
    ].join("\n");
  }

  function ensureSpace(lines = 1) {
    if (!currentPage) startPage();
    if (cursorY - lines * LINE_HEIGHT < BODY_BOTTOM) {
      startPage();
    }
  }

  function line(text: string, options?: { x?: number; font?: "F1" | "F2"; size?: number }) {
    ensureSpace();
    const x = options?.x ?? MARGIN_X;
    const font = options?.font ?? "F1";
    const size = options?.size ?? 10;
    currentPage += `\nBT /${font} ${size} Tf ${x} ${cursorY} Td (${escapePdfText(text)}) Tj ET`;
    cursorY -= LINE_HEIGHT;
  }

  function paragraph(text: string) {
    for (const wrapped of wrapText(text)) {
      line(wrapped);
    }
    cursorY -= 2;
  }

  function section(title: string) {
    ensureSpace(2);
    line(title, { font: "F2", size: 12 });
    currentPage += `\n0.85 0.89 0.95 rg\n${MARGIN_X} ${cursorY + 4} ${PAGE_WIDTH - MARGIN_X * 2} 1 re f\n0 g`;
    cursorY -= 6;
  }

  function row(columns: Array<{ text: string; x: number }>) {
    ensureSpace();
    for (const column of columns) {
      currentPage += `\nBT /F1 9 Tf ${column.x} ${cursorY} Td (${escapePdfText(column.text)}) Tj ET`;
    }
    cursorY -= LINE_HEIGHT;
  }

  startPage();

  paragraph(
    `Prepared for ${report.organisation?.organisationName ?? "your organisation"} covering ${formatDate(report.range.start)} to ${formatDate(new Date(report.range.end.getTime() - 86400000))}.`
  );

  section("Summary");
  line(`Total income: ${formatAmount(report.totals.income, report.currencyDesignator)}`);
  line(`Total expenses: ${formatAmount(report.totals.expense, report.currencyDesignator)}`);
  line(`Net position: ${formatAmount(report.totals.net, report.currencyDesignator)}`);
  line(`Tenancy-linked income: ${formatAmount(report.totals.tenancyLinkedIncome, report.currencyDesignator)}`);
  line(`Other income: ${formatAmount(report.totals.otherIncome, report.currencyDesignator)}`);
  line(`Tenancy-linked expenses: ${formatAmount(report.totals.tenancyLinkedExpense, report.currencyDesignator)}`);
  line(`Organisation expenses: ${formatAmount(report.totals.organisationExpense, report.currencyDesignator)}`);

  section("Monthly Cashflow");
  row([
    { text: "Month", x: MARGIN_X },
    { text: "Income", x: 180 },
    { text: "Expense", x: 300 },
    { text: "Net", x: 420 }
  ]);
  for (const month of report.monthlySeries) {
    row([
      { text: month.label, x: MARGIN_X },
      { text: formatAmount(month.income, report.currencyDesignator), x: 180 },
      { text: formatAmount(month.expense, report.currencyDesignator), x: 300 },
      { text: formatAmount(month.income - month.expense, report.currencyDesignator), x: 420 }
    ]);
  }

  section("Income Entries");
  row([
    { text: "Date", x: MARGIN_X },
    { text: "Category", x: 95 },
    { text: "Linked to", x: 190 },
    { text: "Amount", x: 405 },
    { text: "Notes", x: 485 }
  ]);
  for (const entry of report.incomes) {
    row([
      { text: formatDate(entry.paymentDate), x: MARGIN_X },
      { text: truncate(entry.category.name, 16), x: 95 },
      { text: truncate(entry.tenancyAgreement?.property.name ?? "Unlinked", 30), x: 190 },
      { text: formatAmount(entry.amount.toNumber(), report.currencyDesignator), x: 405 },
      { text: truncate(entry.notes ?? "", 18), x: 485 }
    ]);
  }

  section("Expense Entries");
  row([
    { text: "Date", x: MARGIN_X },
    { text: "Category", x: 95 },
    { text: "Scope", x: 190 },
    { text: "Gross", x: 355 },
    { text: "VAT", x: 430 },
    { text: "Supplier", x: 485 }
  ]);
  for (const entry of report.expenses) {
    row([
      { text: formatDate(entry.dueDate), x: MARGIN_X },
      { text: truncate(entry.category.name, 16), x: 95 },
      {
        text: truncate(
          entry.organisationExpense ? "Organisation expense" : entry.tenancyAgreement?.property.name ?? "Unlinked",
          24
        ),
        x: 190
      },
      { text: formatAmount(entry.grossAmount.toNumber(), report.currencyDesignator), x: 355 },
      { text: formatAmount(entry.vatAmount.toNumber(), report.currencyDesignator), x: 430 },
      { text: truncate(entry.supplier, 16), x: 485 }
    ]);
  }

  flushPage();

  let objectId = 1;
  const catalogId = objectId++;
  const pagesId = objectId++;
  const fontRegularId = objectId++;
  const fontBoldId = objectId++;
  const imageId = embeddedLogo ? objectId++ : null;

  const pageObjectIds = pages.map(() => objectId++);
  const contentObjectIds = pages.map(() => objectId++);

  const objects = new Map<number, Buffer>();
  objects.set(catalogId, Buffer.from(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`, "binary"));
  objects.set(
    pagesId,
    Buffer.from(`<< /Type /Pages /Count ${pageObjectIds.length} /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] >>`, "binary")
  );
  objects.set(fontRegularId, Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", "binary"));
  objects.set(fontBoldId, Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>", "binary"));

  if (embeddedLogo && imageId) {
    objects.set(imageId, embeddedLogo.objectBody);
  }

  pages.forEach((content, index) => {
    const contentBuffer = Buffer.from(content, "binary");
    const contentId = contentObjectIds[index];
    const pageId = pageObjectIds[index];
    const resources = embeddedLogo && imageId
      ? `<< /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> /XObject << /Im1 ${imageId} 0 R >> >>`
      : `<< /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >>`;

    objects.set(
      contentId,
      Buffer.concat([
        Buffer.from(`<< /Length ${contentBuffer.length} >>\nstream\n`, "binary"),
        contentBuffer,
        Buffer.from("\nendstream", "binary")
      ])
    );

    objects.set(
      pageId,
      Buffer.from(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources ${resources} /Contents ${contentId} 0 R >>`,
        "binary"
      )
    );
  });

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (let id = 1; id < objectId; id += 1) {
    offsets[id] = Buffer.byteLength(pdf, "binary");
    const body = objects.get(id);
    if (!body) continue;
    pdf += `${id} 0 obj\n`;
    pdf += body.toString("binary");
    pdf += "\nendobj\n";
  }

  const xrefOffset = Buffer.byteLength(pdf, "binary");
  pdf += `xref\n0 ${objectId}\n`;
  pdf += "0000000000 65535 f \n";

  for (let id = 1; id < objectId; id += 1) {
    pdf += `${String(offsets[id] ?? 0).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objectId} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "binary");
}
