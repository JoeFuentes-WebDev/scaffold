import { createClient } from "@/lib/supabase/server";
import { createProject } from "@/lib/services/projectService";
import {
  CreateProjectSchema,
  invalidRequestResponse,
} from "@/lib/schemas";
import { handleRouteError } from "@/lib/utils/routeError";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = CreateProjectSchema.safeParse(body);

  if (!parsed.success) {
    return invalidRequestResponse(parsed.error);
  }

  const data = parsed.data;

  try {
    const result = await createProject(user.id, {
      name: data.name,
      description: data.description,
      seed_answers: data.seed_answers,
      project_type: data.project_type,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(
      error,
      "POST /api/projects",
      "Failed to create project. Please try again."
    );
  }
}
