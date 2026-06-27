import { getAuthenticatedSupabase } from "@/lib/services/authService";
import { markReviewProcessed } from "@/lib/services/artifactService";
import { verifyProjectAccess } from "@/lib/services/projectAccessService";
import {
  CompleteReviewSchema,
  invalidRequestResponse,
} from "@/lib/schemas";
import { handleRouteError } from "@/lib/utils/routeError";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedSupabase();

    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = CompleteReviewSchema.safeParse(body);

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

    const artifact = await markReviewProcessed(
      auth.supabase,
      parsed.data.project_id
    );

    return NextResponse.json({ artifact });
  } catch (error) {
    return handleRouteError(
      error,
      "POST /api/review/complete",
      "Failed to complete review gate. Please try again."
    );
  }
}
