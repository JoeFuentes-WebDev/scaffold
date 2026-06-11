import { isValidDomainName } from "@/lib/data/domains";
import { getAuthenticatedSupabase } from "@/lib/services/authService";
import { verifyProjectAccess } from "@/lib/services/projectAccessService";
import { getDomainRounds } from "@/lib/services/roundService";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const auth = await getAuthenticatedSupabase();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id");
  const domainName = searchParams.get("domain_name");

  if (!projectId?.trim()) {
    return NextResponse.json({ error: "project_id is required" }, { status: 400 });
  }

  if (!domainName?.trim()) {
    return NextResponse.json(
      { error: "domain_name is required" },
      { status: 400 }
    );
  }

  if (!isValidDomainName(domainName)) {
    return NextResponse.json({ error: "Invalid domain_name" }, { status: 400 });
  }

  const hasAccess = await verifyProjectAccess(
    auth.supabase,
    projectId,
    auth.user.id
  );

  if (!hasAccess) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const rounds = await getDomainRounds(
      auth.supabase,
      projectId,
      domainName
    );

    return NextResponse.json({ rounds });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch rounds";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
