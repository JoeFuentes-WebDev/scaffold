import { NextResponse } from "next/server";

export function logRouteError(error: unknown, context: string): void {
  console.error(`[${context}]`, error);
}

export function handleRouteError(
  error: unknown,
  context: string,
  fallbackMessage: string
): NextResponse {
  logRouteError(error, context);
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
