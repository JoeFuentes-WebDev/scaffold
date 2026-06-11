import type { SupabaseClient } from "@supabase/supabase-js";

import type { Domain, DomainName, DomainStatus } from "@/lib/types";

export async function getDomainsForProject(
  supabase: SupabaseClient,
  projectId: string
): Promise<Domain[]> {
  const { data, error } = await supabase
    .from("domains")
    .select("*")
    .eq("project_id", projectId);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getDomainsByProjectId(
  supabase: SupabaseClient,
  projectId: string
): Promise<Domain[]> {
  return getDomainsForProject(supabase, projectId);
}

export async function getDomainByName(
  supabase: SupabaseClient,
  projectId: string,
  name: string
): Promise<Domain | null> {
  const { data, error } = await supabase
    .from("domains")
    .select("*")
    .eq("project_id", projectId)
    .eq("name", name)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateDomainStatus(
  supabase: SupabaseClient,
  id: string,
  status: DomainStatus
): Promise<Domain> {
  const { data, error } = await supabase
    .from("domains")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateDomainData(
  supabase: SupabaseClient,
  id: string,
  data: Record<string, unknown>
): Promise<Domain> {
  const { data: existing, error: fetchError } = await supabase
    .from("domains")
    .select("data")
    .eq("id", id)
    .single();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  const mergedData = {
    ...(existing.data as Record<string, unknown>),
    ...data,
  };

  const { data: domain, error } = await supabase
    .from("domains")
    .update({ data: mergedData })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return domain;
}

export async function unlockDomain(
  supabase: SupabaseClient,
  projectId: string,
  domainName: string
): Promise<void> {
  const domain = await getDomainByName(supabase, projectId, domainName);

  if (!domain || domain.status !== "locked") {
    return;
  }

  await updateDomainStatus(supabase, domain.id, "available");
}

export async function getDomainById(
  supabase: SupabaseClient,
  id: string
): Promise<Domain | null> {
  const { data, error } = await supabase
    .from("domains")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export function isValidDomainName(name: string): name is DomainName {
  const validNames: DomainName[] = [
    "product",
    "scope",
    "users",
    "architecture",
    "tech_stack",
    "domain_model",
    "engineering_rules",
    "deployment",
  ];

  return validNames.includes(name as DomainName);
}
