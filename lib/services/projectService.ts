import { getDomainsByProjectId } from "@/lib/data/domains";
import {
  getProjectById,
  getProjectsByUserId,
  insertDomainsForProject,
  insertProject,
  updateProject,
} from "@/lib/data/projects";
import {
  deleteRound,
  getPendingRoundsForProject,
} from "@/lib/data/rounds";
import { createClient } from "@/lib/supabase/server";
import type {
  CreateProjectInput,
  Domain,
  DomainName,
  Project,
  UpdateProjectResult,
} from "@/lib/types";

import { buildProjectDescription } from "@/constants/coldStart";
import { generateRound } from "@/lib/services/roundService";

export async function createProject(
  userId: string,
  input: CreateProjectInput
): Promise<{ project_id: string }> {
  const supabase = await createClient();
  const description = buildProjectDescription(
    input.seed_answers,
    input.description
  );

  const project = await insertProject(supabase, userId, {
    name: input.name,
    description,
    project_type: input.project_type,
  });
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

export async function updateProjectDescription(
  userId: string,
  projectId: string,
  description: string
): Promise<UpdateProjectResult> {
  const supabase = await createClient();
  const project = await getProjectById(supabase, projectId);

  if (!project || project.user_id !== userId) {
    throw new Error("Project not found");
  }

  const updatedProject = await updateProject(supabase, projectId, {
    description,
  });

  const pendingRounds = await getPendingRoundsForProject(supabase, projectId);
  const pendingDomains = [
    ...new Set(pendingRounds.map((round) => round.domain_name)),
  ] as DomainName[];

  return {
    project: updatedProject,
    pending_domains: pendingDomains,
  };
}

export async function regeneratePendingRoundsForProject(
  userId: string,
  projectId: string,
  domainNames: DomainName[]
): Promise<void> {
  const supabase = await createClient();
  const project = await getProjectById(supabase, projectId);

  if (!project || project.user_id !== userId) {
    throw new Error("Project not found");
  }

  const pendingRounds = await getPendingRoundsForProject(supabase, projectId);

  for (const domainName of domainNames) {
    const pendingRound = pendingRounds.find(
      (round) => round.domain_name === domainName
    );

    if (pendingRound) {
      await deleteRound(supabase, pendingRound.id);
    }

    await generateRound(supabase, projectId, domainName, {
      forceRegenerate: true,
    });
  }
}
