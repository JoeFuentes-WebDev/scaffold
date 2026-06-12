import { getAuthenticatedSupabase } from "@/lib/services/authService";
import { getArtifactsWorkspaceForProject } from "@/lib/services/artifactService";
import { verifyProjectAccess } from "@/lib/services/projectAccessService";
import {
  invalidRequestResponse,
  ProjectIdQuerySchema,
} from "@/lib/schemas";
import { handleRouteError } from "@/lib/utils/routeError";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const auth = await getAuthenticatedSupabase();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = ProjectIdQuerySchema.safeParse({
    project_id: searchParams.get("project_id"),
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
    const result = await getArtifactsWorkspaceForProject(
      auth.supabase,
      parsed.data.project_id
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(
      error,
      "GET /api/artifacts",
      "Failed to load artifacts. Please try again."
    );
  }
}
