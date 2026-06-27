import { callClaude, parseClaudeJson } from "@/lib/claude/client";
import {
  getDomainById,
  getDomainByName,
  getDomainsForProject,
  unlockDomain,
  updateDomainStatus,
} from "@/lib/data/domains";
import { getProjectById } from "@/lib/data/projects";
import { getRoundsForProject } from "@/lib/data/rounds";
import { getDocumentsTabStatus } from "@/lib/services/domainStatus";
import {
  buildCheckUnlocksPrompt,
  buildCheckUnlocksSystemPrompt,
  type CheckUnlocksResponse,
} from "@/lib/prompts/checkUnlocks";
import { createClient } from "@/lib/supabase/server";
import type {
  CheckDomainUnlocksResult,
  Domain,
  DomainName,
  DomainStatus,
} from "@/lib/types";

function isValidDomainName(name: string): name is DomainName {
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

export async function checkDomainUnlocks(
  projectId: string
): Promise<CheckDomainUnlocksResult> {
  const supabase = await createClient();
  const project = await getProjectById(supabase, projectId);

  if (!project) {
    throw new Error("Project not found");
  }

  const domains = await getDomainsForProject(supabase, projectId);
  const lockedDomains = domains.filter((domain) => domain.status === "locked");

  if (lockedDomains.length === 0) {
    return {
      unlocked_domains: [],
      documents_status: getDocumentsTabStatus(domains),
    };
  }

  const rounds = await getRoundsForProject(supabase, projectId);
  const systemPrompt = buildCheckUnlocksSystemPrompt();
  const userPrompt = buildCheckUnlocksPrompt({ project, domains, rounds });

  try {
    const rawResponse = await callClaude(systemPrompt, userPrompt);
    const parsed = parseClaudeJson<CheckUnlocksResponse>(rawResponse);
    const unlockedDomains: DomainName[] = [];

    for (const domainName of parsed.domains_to_unlock ?? []) {
      if (!isValidDomainName(domainName)) {
        continue;
      }

      const domain = await getDomainByName(supabase, projectId, domainName);
      if (!domain || domain.status !== "locked") {
        continue;
      }

      await unlockDomain(supabase, projectId, domainName);
      unlockedDomains.push(domainName);
    }

    const updatedDomains = await getDomainsForProject(supabase, projectId);

    return {
      unlocked_domains: unlockedDomains,
      documents_status: getDocumentsTabStatus(updatedDomains),
    };
  } catch (error) {
    console.error("[checkDomainUnlocks]", error);
    return {
      unlocked_domains: [],
      documents_status: getDocumentsTabStatus(domains),
    };
  }
}

/** @deprecated Use checkDomainUnlocks */
export async function checkDocumentsUnlock(
  projectId: string
): Promise<DomainStatus> {
  const result = await checkDomainUnlocks(projectId);
  return result.documents_status;
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
