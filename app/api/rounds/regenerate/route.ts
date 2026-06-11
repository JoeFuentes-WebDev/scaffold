import { isValidDomainName } from "@/lib/data/domains";
import { getAuthenticatedSupabase } from "@/lib/services/authService";
import { verifyProjectAccess } from "@/lib/services/projectAccessService";
import { regenerateRound } from "@/lib/services/roundService";
import { NextResponse } from "next/server";

interface RegenerateRoundBody {
  project_id?: string;
  domain_name?: string;
  round_id?: string;
}

function validateBody(body: RegenerateRoundBody): string | null {
  if (!body.project_id?.trim()) {
    return "project_id is required";
  }

  if (!body.domain_name?.trim()) {
    return "domain_name is required";
  }

  if (!isValidDomainName(body.domain_name)) {
    return "Invalid domain_name";
  }

  if (!body.round_id?.trim()) {
    return "round_id is required";
  }

  return null;
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabase();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as RegenerateRoundBody;
  const validationError = validateBody(body);

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
    const round = await regenerateRound(
      auth.supabase,
      body.project_id!,
      body.domain_name!,
      body.round_id!
    );

    return NextResponse.json({ round });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Something went wrong regenerating questions. Please try again.";

    console.error("Regenerate round error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
