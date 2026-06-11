import { isValidDomainName } from "@/lib/data/domains";
import { getAuthenticatedSupabase } from "@/lib/services/authService";
import { verifyProjectAccess } from "@/lib/services/projectAccessService";
import { generateRound } from "@/lib/services/roundService";
import { NextResponse } from "next/server";

interface GenerateRoundBody {
  project_id?: string;
  domain_name?: string;
}

function validateGenerateBody(body: GenerateRoundBody): string | null {
  if (!body.project_id?.trim()) {
    return "project_id is required";
  }

  if (!body.domain_name?.trim()) {
    return "domain_name is required";
  }

  if (!isValidDomainName(body.domain_name)) {
    return "Invalid domain_name";
  }

  return null;
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabase();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as GenerateRoundBody;
  const validationError = validateGenerateBody(body);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const hasAccess = await verifyProjectAccess(
    auth.supabase,
    body.project_id!,
    auth.user.id
  );

  if (!hasAccess) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const round = await generateRound(
      auth.supabase,
      body.project_id!,
      body.domain_name!
    );

    return NextResponse.json({ round });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Something went wrong generating questions. Please try again.";

    console.error("Generate round error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
