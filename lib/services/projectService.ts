import { getDomainsByProjectId } from "@/lib/data/domains";
import {
  getProjectById,
  getProjectsByUserId,
  insertDomainsForProject,
  insertProject,
} from "@/lib/data/projects";
import { createClient } from "@/lib/supabase/server";
import type { CreateProjectInput, Domain, Project } from "@/lib/types";

export async function createProject(
  userId: string,
  input: CreateProjectInput
): Promise<{ project_id: string }> {
  const supabase = await createClient();

  const project = await insertProject(supabase, userId, input);
  await insertDomainsForProject(supabase, project.id);

  return { project_id: project.id };
}

export async function listProjectsForUser(userId: string): Promise<Project[]> {
  const supabase = await createClient();
  return getProjectsByUserId(supabase, userId);
}

export async function getProjectWithDomains(
  projectId: string
): Promise<{ project: Project; domains: Domain[] } | null> {
  const supabase = await createClient();
  const project = await getProjectById(supabase, projectId);

  if (!project) {
    return null;
  }

  const domains = await getDomainsByProjectId(supabase, projectId);

  return { project, domains };
}
