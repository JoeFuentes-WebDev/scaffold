import { createClient } from "@/lib/supabase/server";
import { createProject } from "@/lib/services/projectService";
import { NextResponse } from "next/server";

interface CreateProjectBody {
  name?: string;
  description?: string;
  project_type?: "new" | "existing";
}

function validateCreateProjectBody(body: CreateProjectBody): string | null {
  if (!body.name?.trim()) {
    return "Project name is required";
  }

  if (!body.description?.trim()) {
    return "Project description is required";
  }

  return null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as CreateProjectBody;
  const validationError = validateCreateProjectBody(body);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const result = await createProject(user.id, {
      name: body.name!.trim(),
      description: body.description!.trim(),
      project_type: body.project_type ?? "new",
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
