import { NextResponse } from "next/server";

import { DomainError } from "@/lib/domain/services";

export function toJson(data: unknown, status = 200) {
  return NextResponse.json(JSON.parse(JSON.stringify(data)), { status });
}

export function handleDomainRouteError(error: unknown) {
  if (error instanceof DomainError) {
    return NextResponse.json(
      {
        error: error.message,
        fieldErrors: error.fieldErrors
      },
      { status: 400 }
    );
  }

  throw error;
}
