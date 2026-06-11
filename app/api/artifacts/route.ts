import { getAuthenticatedSupabase } from "@/lib/services/authService";
import { listArtifactsForProject } from "@/lib/services/artifactService";
import { verifyProjectAccess } from "@/lib/services/projectAccessService";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const auth = await getAuthenticatedSupabase();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id");

  if (!projectId?.trim()) {
    return NextResponse.json({ error: "project_id is required" }, { status: 400 });
  }

  const hasAccess = await verifyProjectAccess(
    auth.supabase,
    projectId,
    auth.user.id
  );

  if (!hasAccess) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const artifacts = await listArtifactsForProject(auth.supabase, projectId);
    return NextResponse.json({ artifacts });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch artifacts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
