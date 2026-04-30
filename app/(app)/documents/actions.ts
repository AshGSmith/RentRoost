"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getTenantContext } from "@/lib/auth/tenant";
import { type FormState } from "@/lib/domain/form-state";
import {
  DocumentServiceError,
  parseUploadDocumentInput,
  uploadDocument
} from "@/lib/documents/service";

export async function uploadDocumentAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getTenantContext();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return {
      message: "Please choose a file to upload.",
      errors: {
        file: ["Please choose a file to upload."]
      }
    };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const document = await uploadDocument(
      parseUploadDocumentInput(formData),
      {
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size,
        fileData: buffer
      },
      {
        tenantUserId: context.tenantUserId,
        actorUserId: context.user.id
      }
    );

    revalidatePath("/documents");
    redirect(`/documents/${document.id}`);
  } catch (error) {
    if (error instanceof DocumentServiceError) {
      return { message: error.message, errors: error.fieldErrors };
    }

    throw error;
  }
}
