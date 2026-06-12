import { getAuthenticatedSupabase } from "@/lib/services/authService";
import { verifyProjectAccess } from "@/lib/services/projectAccessService";
import { getDomainRounds } from "@/lib/services/roundService";
import {
  GetRoundsQuerySchema,
  invalidRequestResponse,
} from "@/lib/schemas";
import { handleRouteError } from "@/lib/utils/routeError";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const auth = await getAuthenticatedSupabase();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = GetRoundsQuerySchema.safeParse({
    project_id: searchParams.get("project_id"),
    domain_name: searchParams.get("domain_name"),
  });

  if (!parsed.success) {
    return invalidRequestResponse(parsed.error);
  }

  const hasAccess = await verifyProjectAccess(
    auth.supabase,
    parsed.data.project_id,
    auth.user.id
  );

  if (!hasAccess) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const rounds = await getDomainRounds(
      auth.supabase,
      parsed.data.project_id,
      parsed.data.domain_name
    );

    return NextResponse.json({ rounds });
  } catch (error) {
    return handleRouteError(
      error,
      "GET /api/rounds",
      "Failed to load questions. Please try again."
    );
  }
}
