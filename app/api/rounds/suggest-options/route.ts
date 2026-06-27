import { getAuthenticatedSupabase } from "@/lib/services/authService";
import { verifyProjectAccess } from "@/lib/services/projectAccessService";
import { suggestAnswerOptions } from "@/lib/services/roundService";
import {
  invalidRequestResponse,
  SuggestOptionsSchema,
} from "@/lib/schemas";
import { handleRouteError } from "@/lib/utils/routeError";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabase();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = SuggestOptionsSchema.safeParse(body);

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
    const options = await suggestAnswerOptions(
      auth.supabase,
      data.project_id,
      data.domain_name,
      data.question_text
    );

    return NextResponse.json({ options });
  } catch (error) {
    return handleRouteError(
      error,
      "POST /api/rounds/suggest-options",
      "Failed to suggest options. Please try again."
    );
  }
}
