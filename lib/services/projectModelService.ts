import type { SupabaseClient } from "@supabase/supabase-js";

import { getDomainsForProject } from "@/lib/data/domains";
import { getProjectById } from "@/lib/data/projects";
import { getRoundsForProject } from "@/lib/data/rounds";
import type { ProjectModel } from "@/lib/types";

export async function assembleProjectModel(
  supabase: SupabaseClient,
  projectId: string
): Promise<ProjectModel> {
  const project = await getProjectById(supabase, projectId);

  if (!project) {
    throw new Error("Project not found");
  }

  const domains = await getDomainsForProject(supabase, projectId);
  const rounds = await getRoundsForProject(supabase, projectId);

  return { project, domains, rounds };
}
