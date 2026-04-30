import { NextResponse } from "next/server";

import { getTenantContext } from "@/lib/auth/tenant";
import { getDocumentForUser } from "@/lib/documents/service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const [{ id }, { tenantUserId }] = await Promise.all([params, getTenantContext()]);
  const document = await getDocumentForUser(tenantUserId, id);

  if (!document) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const wantsDocLike = searchParams.get("format") === "doc";
  const download = searchParams.get("download") === "1";

  if (wantsDocLike && typeof document.metadata === "object" && document.metadata && "docLikeHtml" in document.metadata) {
    const html = String((document.metadata as { docLikeHtml?: string }).docLikeHtml ?? "");
    return new NextResponse(html, {
      headers: {
        "Content-Type": "application/msword; charset=utf-8",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${document.name}.doc"`
      }
    });
  }

  return new NextResponse(Buffer.from(document.fileData), {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Length": String(document.fileSize),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${document.fileName}"`
    }
  });
}
