import type { ProjectModel } from "@/lib/types";

import { summarizeRoundsForPrompt } from "@/lib/prompts/roundSummary";

export function buildProjectModelUserMessage(model: ProjectModel): string {
  const domainSummary = model.domains
    .map(
      (domain) =>
        `- ${domain.name}: status=${domain.status}, data=${JSON.stringify(domain.data)}`
    )
    .join("\n");

  return `Project name: ${model.project.name}
Project description: ${model.project.description ?? "No description provided."}
Project type: ${model.project.project_type}
Project status: ${model.project.status}

All domains:
${domainSummary}

All rounds across all domains:
${summarizeRoundsForPrompt(model.rounds)}`;
}

export function buildProjectModelUserMessageForEnvManifest(
  model: ProjectModel
): string {
  const focusDomains = model.domains.filter((domain) =>
    ["tech_stack", "deployment"].includes(domain.name)
  );

  const focusSummary = focusDomains
    .map(
      (domain) =>
        `- ${domain.name}: status=${domain.status}, data=${JSON.stringify(domain.data)}`
    )
    .join("\n");

  return `${buildProjectModelUserMessage(model)}

Focus domains for this artifact:
${focusSummary}`;
}
