import { isValidDomainName } from "@/lib/data/domains";
import { getAuthenticatedSupabase } from "@/lib/services/authService";
import { verifyProjectAccess } from "@/lib/services/projectAccessService";
import { createClarificationRound } from "@/lib/services/roundService";
import { NextResponse } from "next/server";

interface ClarifyBody {
  project_id?: string;
  domain_name?: string;
  clarification?: string;
}

function validateBody(body: ClarifyBody): string | null {
  if (!body.project_id?.trim()) {
    return "project_id is required";
  }

  if (!body.domain_name?.trim()) {
    return "domain_name is required";
  }

  if (!isValidDomainName(body.domain_name)) {
    return "Invalid domain_name";
  }

  if (!body.clarification?.trim()) {
    return "clarification is required";
  }

  return null;
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabase();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as ClarifyBody;
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
    const round = await createClarificationRound(
      auth.supabase,
      body.project_id!,
      body.domain_name!,
      body.clarification!.trim()
    );

    return NextResponse.json({ round });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save clarification";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
