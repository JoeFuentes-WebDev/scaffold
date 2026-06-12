import { getAuthenticatedSupabase } from "@/lib/services/authService";
import { verifyProjectAccess } from "@/lib/services/projectAccessService";
import { evaluateRound } from "@/lib/services/roundService";
import {
  EvaluateRoundSchema,
  invalidRequestResponse,
} from "@/lib/schemas";
import { handleRouteError } from "@/lib/utils/routeError";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabase();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = EvaluateRoundSchema.safeParse(body);

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
    const result = await evaluateRound(
      auth.supabase,
      data.project_id,
      data.domain_name,
      data.round_id,
      data.answers
    );

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(
      error,
      "POST /api/rounds/evaluate",
      "Something went wrong evaluating answers. Please try again."
    );
  }
}
