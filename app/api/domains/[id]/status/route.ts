import { getDomainById } from "@/lib/data/domains";
import { getAuthenticatedSupabase } from "@/lib/services/authService";
import {
  checkDomainUnlocks,
  setDomainStatus,
} from "@/lib/services/domainService";
import { verifyProjectAccess } from "@/lib/services/projectAccessService";
import {
  invalidRequestResponse,
  UpdateDomainStatusSchema,
} from "@/lib/schemas";
import { handleRouteError } from "@/lib/utils/routeError";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await getAuthenticatedSupabase();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = UpdateDomainStatusSchema.safeParse(body);

  if (!parsed.success) {
    return invalidRequestResponse(parsed.error);
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
    const updatedDomain = await setDomainStatus(id, parsed.data.status);
    const unlockResult = await checkDomainUnlocks(domain.project_id);

    return NextResponse.json({
      domain: updatedDomain,
      documents_status: unlockResult.documents_status,
      unlocked_domains: unlockResult.unlocked_domains,
    });
  } catch (error) {
    return handleRouteError(
      error,
      "PATCH /api/domains/[id]/status",
      "Failed to update domain status. Please try again."
    );
  }
}
