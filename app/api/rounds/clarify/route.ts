import { getAuthenticatedSupabase } from "@/lib/services/authService";
import { verifyProjectAccess } from "@/lib/services/projectAccessService";
import { createClarificationRound } from "@/lib/services/roundService";
import {
  ClarifyRoundSchema,
  invalidRequestResponse,
} from "@/lib/schemas";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabase();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = ClarifyRoundSchema.safeParse(body);

  if (!parsed.success) {
    return invalidRequestResponse(parsed.error);
  }

  const data = parsed.data;

  const hasAccess = await verifyProjectAccess(
    auth.supabase,
    data.project_id,
    auth.user.id
  );

  if (!hasAccess) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const round = await createClarificationRound(
      auth.supabase,
      data.project_id,
      data.domain_name,
      data.clarification
    );

    return NextResponse.json({ round });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save clarification";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
