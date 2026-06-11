import { getAuthenticatedSupabase } from "@/lib/services/authService";
import { parseReviewMarkdown } from "@/lib/services/reviewParser";
import {
  invalidRequestResponse,
  ParseReviewSchema,
} from "@/lib/schemas";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabase();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = ParseReviewSchema.safeParse(body);

  if (!parsed.success) {
    return invalidRequestResponse(parsed.error);
  }

  return NextResponse.json(parseReviewMarkdown(parsed.data.content));
}
