import { createClient } from "@/lib/supabase/server";
import { createProject } from "@/lib/services/projectService";
import {
  CreateProjectSchema,
  invalidRequestResponse,
} from "@/lib/schemas";
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
    const message =
      error instanceof Error ? error.message : "Failed to create project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
