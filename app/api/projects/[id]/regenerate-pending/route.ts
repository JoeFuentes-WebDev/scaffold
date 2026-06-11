import { getAuthenticatedSupabase } from "@/lib/services/authService";
import { verifyProjectAccess } from "@/lib/services/projectAccessService";
import { regeneratePendingRoundsForProject } from "@/lib/services/projectService";
import type { DomainName } from "@/lib/types";
import { NextResponse } from "next/server";

interface RegeneratePendingBody {
  domain_names?: DomainName[];
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await getAuthenticatedSupabase();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as RegeneratePendingBody;

  if (!body.domain_names || body.domain_names.length === 0) {
    return NextResponse.json(
      { error: "domain_names is required" },
      { status: 400 }
    );
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
    await regeneratePendingRoundsForProject(
      auth.user.id,
      id,
      body.domain_names
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to regenerate pending rounds";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
