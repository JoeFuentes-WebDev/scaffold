import { createClient } from "@/lib/supabase/server";
import { validateColdStartSeedAnswers } from "@/constants/coldStart";
import { createProject } from "@/lib/services/projectService";
import type { ColdStartSeedAnswers } from "@/lib/types";
import { NextResponse } from "next/server";

interface CreateProjectBody {
  name?: string;
  description?: string;
  seed_answers?: Partial<ColdStartSeedAnswers>;
  project_type?: "new" | "existing";
}

function validateCreateProjectBody(body: CreateProjectBody): string | null {
  if (!body.name?.trim()) {
    return "Project name is required";
  }

  return validateColdStartSeedAnswers(body.seed_answers);
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
    const seedAnswers = {
      what_it_does: body.seed_answers!.what_it_does!.trim(),
      who_it_is_for: body.seed_answers!.who_it_is_for!.trim(),
      v1_boundary: body.seed_answers!.v1_boundary!.trim(),
    };

    const result = await createProject(user.id, {
      name: body.name!.trim(),
      description: body.description?.trim(),
      seed_answers: seedAnswers,
      project_type: body.project_type ?? "new",
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
