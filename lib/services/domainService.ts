import {
  getDomainById,
  getDomainsForProject,
  updateDomainStatus,
} from "@/lib/data/domains";
import { getDocumentsTabStatus } from "@/lib/documents/status";
import { createClient } from "@/lib/supabase/server";
import type { Domain, DomainStatus } from "@/lib/types";

export { getDocumentsTabStatus };

export async function checkDocumentsUnlock(
  projectId: string
): Promise<DomainStatus> {
  const supabase = await createClient();
  const domains = await getDomainsForProject(supabase, projectId);
  return getDocumentsTabStatus(domains);
}

export async function setDomainStatus(
  domainId: string,
  status: DomainStatus
): Promise<Domain> {
  const supabase = await createClient();
  const domain = await getDomainById(supabase, domainId);

  if (!domain) {
    throw new Error("Domain not found");
  }

  return updateDomainStatus(supabase, domainId, status);
}

export async function listDomainsForProject(
  projectId: string
): Promise<Domain[]> {
  const supabase = await createClient();
  return getDomainsForProject(supabase, projectId);
}
