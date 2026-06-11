import { getAuthenticatedSupabase } from "@/lib/services/authService";
import { checkDomainUnlocks } from "@/lib/services/domainService";
import { verifyProjectAccess } from "@/lib/services/projectAccessService";
import {
  CheckUnlocksSchema,
  invalidRequestResponse,
} from "@/lib/schemas";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabase();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = CheckUnlocksSchema.safeParse(body);

  if (!parsed.success) {
    return invalidRequestResponse(parsed.error);
  }

  const hasAccess = await verifyProjectAccess(
    auth.supabase,
    parsed.data.project_id,
    auth.user.id
  );

  if (!hasAccess) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const result = await checkDomainUnlocks(parsed.data.project_id);
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
