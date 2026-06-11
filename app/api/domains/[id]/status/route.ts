import { getDomainById } from "@/lib/data/domains";
import { getAuthenticatedSupabase } from "@/lib/services/authService";
import {
  checkDomainUnlocks,
  setDomainStatus,
} from "@/lib/services/domainService";
import { verifyProjectAccess } from "@/lib/services/projectAccessService";
import type { DomainStatus } from "@/lib/types";
import { NextResponse } from "next/server";

interface UpdateDomainStatusBody {
  status?: DomainStatus;
}

const VALID_STATUSES: DomainStatus[] = [
  "locked",
  "available",
  "in_progress",
  "complete",
];

function validateStatusBody(body: UpdateDomainStatusBody): string | null {
  if (!body.status) {
    return "status is required";
  }

  if (!VALID_STATUSES.includes(body.status)) {
    return "Invalid status";
  }

  return null;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await getAuthenticatedSupabase();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as UpdateDomainStatusBody;
  const validationError = validateStatusBody(body);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const domain = await getDomainById(auth.supabase, id);

  if (!domain) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  const hasAccess = await verifyProjectAccess(
    auth.supabase,
    domain.project_id,
    auth.user.id
  );

  if (!hasAccess) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  try {
    const updatedDomain = await setDomainStatus(id, body.status!);
    const unlockResult = await checkDomainUnlocks(domain.project_id);

    return NextResponse.json({
      domain: updatedDomain,
      documents_status: unlockResult.documents_status,
      unlocked_domains: unlockResult.unlocked_domains,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update domain status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
