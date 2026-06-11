import { getAuthenticatedSupabase } from "@/lib/services/authService";
import { verifyProjectAccess } from "@/lib/services/projectAccessService";
import { updateProjectDescription } from "@/lib/services/projectService";
import { NextResponse } from "next/server";

interface UpdateProjectBody {
  description?: string;
}

function validateUpdateBody(body: UpdateProjectBody): string | null {
  if (!body.description?.trim()) {
    return "description is required";
  }

  return null;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await getAuthenticatedSupabase();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as UpdateProjectBody;
  const validationError = validateUpdateBody(body);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
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
      body.description!.trim()
    );

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
