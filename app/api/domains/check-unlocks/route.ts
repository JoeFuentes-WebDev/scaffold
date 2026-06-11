import { getAuthenticatedSupabase } from "@/lib/services/authService";
import { checkDomainUnlocks } from "@/lib/services/domainService";
import { verifyProjectAccess } from "@/lib/services/projectAccessService";
import { NextResponse } from "next/server";

interface CheckUnlocksBody {
  project_id?: string;
}

function validateBody(body: CheckUnlocksBody): string | null {
  if (!body.project_id?.trim()) {
    return "project_id is required";
  }

  return null;
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabase();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as CheckUnlocksBody;
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
    const result = await checkDomainUnlocks(body.project_id!);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Something went wrong checking domain unlocks. Please try again.";

    console.error("Check unlocks error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
