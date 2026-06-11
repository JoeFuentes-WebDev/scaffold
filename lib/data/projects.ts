import type { SupabaseClient } from "@supabase/supabase-js";

import { DOMAIN_DEFINITIONS, INITIAL_DOMAIN_STATUSES } from "@/constants/domains";
import type { CreateProjectInput, Domain, Project } from "@/lib/types";

export async function insertProject(
  supabase: SupabaseClient,
  userId: string,
  input: CreateProjectInput
): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      name: input.name,
      description: input.description,
      project_type: input.project_type ?? "new",
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function insertDomainsForProject(
  supabase: SupabaseClient,
  projectId: string
): Promise<Domain[]> {
  const rows = DOMAIN_DEFINITIONS.map((domain) => ({
    project_id: projectId,
    name: domain.name,
    status: INITIAL_DOMAIN_STATUSES[domain.name],
  }));

  const { data, error } = await supabase.from("domains").insert(rows).select();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getProjectsByUserId(
  supabase: SupabaseClient,
  userId: string
): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getProjectById(
  supabase: SupabaseClient,
  projectId: string
): Promise<Project | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateProject(
  supabase: SupabaseClient,
  projectId: string,
  data: { description: string }
): Promise<Project> {
  const { data: project, error } = await supabase
    .from("projects")
    .update({ description: data.description })
    .eq("id", projectId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return project;
}
