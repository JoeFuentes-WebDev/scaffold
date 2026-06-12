import { getAuthenticatedSupabase } from "@/lib/services/authService";
import { verifyProjectAccess } from "@/lib/services/projectAccessService";
import { updateProjectDescription } from "@/lib/services/projectService";
import {
  invalidRequestResponse,
  UpdateProjectSchema,
} from "@/lib/schemas";
import { handleRouteError } from "@/lib/utils/routeError";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await getAuthenticatedSupabase();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = UpdateProjectSchema.safeParse(body);

  if (!parsed.success) {
    return invalidRequestResponse(parsed.error);
  }

  const hasAccess = await verifyProjectAccess(
    auth.supabase,
    id,
    auth.user.id
  );

  if (!hasAccess) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const result = await updateProjectDescription(
      auth.user.id,
      id,
      parsed.data.description
    );

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(
      error,
      "PATCH /api/projects/[id]",
      "Failed to update project. Please try again."
    );
  }
}
