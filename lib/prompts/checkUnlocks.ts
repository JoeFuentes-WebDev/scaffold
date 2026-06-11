import { summarizeRoundsForPrompt } from "@/lib/prompts/roundSummary";
import type { ProjectModel } from "@/lib/types";

export function buildCheckUnlocksSystemPrompt(): string {
  return `You are a senior software architect reviewing a software project's accumulated knowledge.

Given the full project model (description, domain statuses, domain data, and all Q&A rounds), identify which locked domains have enough context to begin their questionnaire.

Rules:
- Be generous — if any answer touches a locked domain's subject area even tangentially, include it.
- It is always better to unlock a domain early than leave it locked when relevant context exists.
- Only return domain names that are currently locked.
- Return ONLY valid JSON. No preamble, no markdown, no explanation.

Return format:
{
  "domains_to_unlock": ["scope", "architecture"]
}`;
}

export function buildCheckUnlocksPrompt(model: ProjectModel): string {
  const lockedDomains = model.domains
    .filter((domain) => domain.status === "locked")
    .map((domain) => domain.name);

  const domainSummary = model.domains
    .map(
      (domain) =>
        `- ${domain.name}: status=${domain.status}, data=${JSON.stringify(domain.data)}`
    )
    .join("\n");

  return `Project name: ${model.project.name}
Project description: ${model.project.description ?? "No description provided."}

Currently locked domains: ${lockedDomains.length > 0 ? lockedDomains.join(", ") : "none"}

All domains:
${domainSummary}

All rounds across all domains:
${summarizeRoundsForPrompt(model.rounds)}

Which locked domains have enough context to unlock?`;
}

export interface CheckUnlocksResponse {
  domains_to_unlock: string[];
}
