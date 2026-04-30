type EmbeddedImage =
  | {
      width: number;
      height: number;
      objectBody: Buffer;
    }
  | null;

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const BODY_TOP = 706;
const BODY_BOTTOM = 54;
const MARGIN_X = 44;
const LINE_HEIGHT = 16;

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapText(value: string, maxCharacters = 86) {
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

  if (current) lines.push(current);
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

function parsePng(buffer: Buffer) {
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

    if (chunkType === "IEND") break;
    offset += chunkLength + 12;
  }

  if (bitDepth !== 8 || ![0, 2].includes(colorType)) {
    throw new Error("Unsupported PNG color format.");
  }

  const colors = colorType === 2 ? 3 : 1;
  const colorSpace = colorType === 2 ? "DeviceRGB" : "DeviceGray";
  const data = Buffer.concat(idatChunks);

  return {
    width,
    height,
    objectBody: Buffer.concat([
      Buffer.from(
        `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /${colorSpace} /BitsPerComponent 8 /Filter /FlateDecode /DecodeParms << /Predictor 15 /Colors ${colors} /BitsPerComponent 8 /Columns ${width} >> /Length ${data.length} >>\nstream\n`,
        "binary"
      ),
      data,
      Buffer.from("\nendstream", "binary")
    ])
  };
}

function parseLogoImage(logoData?: Uint8Array | null, logoMimeType?: string | null): EmbeddedImage {
  if (!logoData || !logoMimeType) return null;

  try {
    const buffer = Buffer.from(logoData);
    if (logoMimeType === "image/jpeg" || logoMimeType === "image/jpg") {
      const dimensions = getJpegDimensions(buffer);

      return {
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

    return null;
  } catch {
    return null;
  }
}

export function buildTemplatePdf(input: {
  title: string;
  organisationName: string;
  logoData?: Uint8Array | null;
  logoMimeType?: string | null;
  renderedText: string;
}) {
  const logo = parseLogoImage(input.logoData, input.logoMimeType);
  const pages: string[] = [];
  let page = "";
  let cursorY = BODY_TOP;

  function flushPage() {
    if (page) {
      pages.push(page);
      page = "";
    }
  }

  function startPage(index: number) {
    flushPage();
    cursorY = BODY_TOP;
    page += [
      "0.16 0.39 0.89 rg",
      `0 744 ${PAGE_WIDTH} 98 re f`,
      "1 1 1 rg",
      `BT /F2 20 Tf ${MARGIN_X} 795 Td (${escapePdfText(input.organisationName)}) Tj ET`,
      `BT /F1 11 Tf ${MARGIN_X} 776 Td (${escapePdfText(input.title)}) Tj ET`,
      `BT /F1 9 Tf ${MARGIN_X} 28 Td (${escapePdfText(`Page ${index}`)}) Tj ET`,
      "0 g"
    ].join("\n");

    if (logo && index === 1) {
      const width = 90;
      const height = (logo.height / logo.width) * width;
      const x = PAGE_WIDTH - MARGIN_X - width;
      const y = 760 - height / 2;
      page += `\nq\n${width} 0 0 ${height} ${x} ${y} cm\n/Im1 Do\nQ`;
    }
  }

  function ensureSpace(lines = 1) {
    if (!page) startPage(pages.length + 1);
    if (cursorY - lines * LINE_HEIGHT < BODY_BOTTOM) {
      startPage(pages.length + 1);
    }
  }

  function line(text: string, font = "F1", size = 11) {
    ensureSpace();
    page += `\nBT /${font} ${size} Tf ${MARGIN_X} ${cursorY} Td (${escapePdfText(text)}) Tj ET`;
    cursorY -= LINE_HEIGHT;
  }

  for (const paragraph of input.renderedText.split(/\n{2,}/)) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;
    for (const wrapped of wrapText(trimmed)) {
      line(wrapped);
    }
    cursorY -= 8;
  }

  flushPage();

  let objectId = 1;
  const catalogId = objectId++;
  const pagesId = objectId++;
  const regularFontId = objectId++;
  const boldFontId = objectId++;
  const imageId = logo ? objectId++ : null;
  const pageIds = pages.map(() => objectId++);
  const contentIds = pages.map(() => objectId++);

  const objects = new Map<number, Buffer>();
  objects.set(catalogId, Buffer.from(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`, "binary"));
  objects.set(
    pagesId,
    Buffer.from(`<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`, "binary")
  );
  objects.set(regularFontId, Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", "binary"));
  objects.set(boldFontId, Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>", "binary"));
  if (logo && imageId) objects.set(imageId, logo.objectBody);

  pages.forEach((content, index) => {
    const contentBuffer = Buffer.from(content, "binary");
    const resources = logo && imageId
      ? `<< /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >> /XObject << /Im1 ${imageId} 0 R >> >>`
      : `<< /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >> >>`;

    objects.set(
      contentIds[index],
      Buffer.concat([
        Buffer.from(`<< /Length ${contentBuffer.length} >>\nstream\n`, "binary"),
        contentBuffer,
        Buffer.from("\nendstream", "binary")
      ])
    );
    objects.set(
      pageIds[index],
      Buffer.from(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources ${resources} /Contents ${contentIds[index]} 0 R >>`,
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
    pdf += `${id} 0 obj\n${body.toString("binary")}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "binary");
  pdf += `xref\n0 ${objectId}\n0000000000 65535 f \n`;
  for (let id = 1; id < objectId; id += 1) {
    pdf += `${String(offsets[id] ?? 0).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objectId} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "binary");
}
