import type { SupabaseClient } from "@supabase/supabase-js";

import {
  canGenerateNextMilestone,
  getArtifactNaming,
  getMilestoneRowNaming,
  getNextMilestoneNaming,
  getNextMilestoneSequenceNumber,
  getReviewNamingForMilestone,
  hasGeneratedMilestone,
} from "@/lib/services/artifactNaming";
import { streamClaude } from "@/lib/claude/client";
import { getArtifactByType, getArtifactsForProject, upsertArtifact } from "@/lib/data/artifacts";
import { getDomainsForProject } from "@/lib/data/domains";
import {
  formatDomainList,
  getMissingDomainsForArtifact,
} from "@/lib/services/domainThresholds";
import {
  buildEnvManifestSystemPrompt,
  buildEnvManifestUserPrompt,
} from "@/lib/prompts/artifacts/envManifest";
import {
  buildMilestoneSystemPrompt,
  buildMilestoneUserPrompt,
} from "@/lib/prompts/artifacts/milestone";
import {
  buildOnboardingSystemPrompt,
  buildOnboardingUserPrompt,
} from "@/lib/prompts/artifacts/onboarding";
import {
  buildReviewSystemPrompt,
  buildReviewUserPrompt,
} from "@/lib/prompts/artifacts/review";
import { assembleProjectModel } from "@/lib/services/projectModelService";
import { ARTIFACT_DEFINITIONS } from "@/constants/artifacts";
import type {
  Artifact,
  ArtifactsWorkspaceUi,
  ArtifactType,
  Domain,
  DomainName,
  MilestoneReviewContext,
  StreamArtifactOptions,
} from "@/lib/types";

interface PromptPair {
  systemPrompt: string;
  userPrompt: string;
}

export interface GenerateArtifactValidation {
  valid: boolean;
  missing_domains: DomainName[];
}

export interface StreamArtifactResult {
  content: string;
  artifact: Artifact;
  isPartial: boolean;
}

function resolveMilestoneSequenceNumber(
  existingArtifact: Artifact | null,
  options?: StreamArtifactOptions
): number {
  if (options?.nextMilestone && hasGeneratedMilestone(existingArtifact)) {
    return getNextMilestoneSequenceNumber(existingArtifact);
  }

  if (options?.regenerate && existingArtifact?.sequence_number) {
    return existingArtifact.sequence_number;
  }

  if (existingArtifact?.sequence_number) {
    return existingArtifact.sequence_number;
  }

  return 1;
}

async function getReviewSequenceNumber(
  supabase: SupabaseClient,
  projectId: string,
  options?: StreamArtifactOptions
): Promise<number> {
  const milestoneArtifact = await getArtifactByType(
    supabase,
    projectId,
    "milestone"
  );

  if (options?.nextMilestone && hasGeneratedMilestone(milestoneArtifact)) {
    return getNextMilestoneSequenceNumber(milestoneArtifact);
  }

  if (milestoneArtifact?.sequence_number) {
    return milestoneArtifact.sequence_number;
  }

  return 1;
}

function resolveSequenceNumber(
  artifactType: ArtifactType,
  existingArtifact: Artifact | null,
  reviewSequence: number,
  options?: StreamArtifactOptions
): number {
  if (artifactType === "milestone") {
    return resolveMilestoneSequenceNumber(existingArtifact, options);
  }

  if (artifactType === "review") {
    return reviewSequence;
  }

  return 1;
}

async function buildPromptsForArtifact(
  supabase: SupabaseClient,
  projectId: string,
  artifactType: ArtifactType,
  sequenceNumber: number,
  reviewContext?: MilestoneReviewContext
): Promise<PromptPair> {
  const model = await assembleProjectModel(supabase, projectId);

  if (artifactType === "onboarding") {
    return {
      systemPrompt: buildOnboardingSystemPrompt(),
      userPrompt: buildOnboardingUserPrompt(model),
    };
  }

  if (artifactType === "milestone") {
    return {
      systemPrompt: buildMilestoneSystemPrompt(),
      userPrompt: buildMilestoneUserPrompt(
        model,
        sequenceNumber,
        reviewContext
      ),
    };
  }

  if (artifactType === "review") {
    return {
      systemPrompt: buildReviewSystemPrompt(),
      userPrompt: buildReviewUserPrompt(model, sequenceNumber),
    };
  }

  return {
    systemPrompt: buildEnvManifestSystemPrompt(),
    userPrompt: buildEnvManifestUserPrompt(model),
  };
}

export async function validateArtifactGeneration(
  supabase: SupabaseClient,
  projectId: string,
  artifactType: ArtifactType
): Promise<GenerateArtifactValidation> {
  const model = await assembleProjectModel(supabase, projectId);
  const missingDomains = getMissingDomainsForArtifact(
    model.domains,
    artifactType
  );

  return {
    valid: missingDomains.length === 0,
    missing_domains: missingDomains,
  };
}

function getArtifactForType(
  artifacts: Artifact[],
  artifactType: ArtifactType
): Artifact | null {
  return artifacts.find((item) => item.artifact_type === artifactType) ?? null;
}

function buildArtifactThresholds(
  domains: Domain[]
): ArtifactsWorkspaceUi["artifactThresholds"] {
  const thresholds = {} as ArtifactsWorkspaceUi["artifactThresholds"];

  for (const definition of ARTIFACT_DEFINITIONS) {
    const missingDomains = getMissingDomainsForArtifact(
      domains,
      definition.type
    );

    thresholds[definition.type] = {
      isReady: missingDomains.length === 0,
      missingLabel: formatDomainList(missingDomains),
    };
  }

  return thresholds;
}

export function buildArtifactsWorkspaceUi(
  artifacts: Artifact[],
  domains: Domain[]
): ArtifactsWorkspaceUi {
  const milestoneArtifact = getArtifactForType(artifacts, "milestone");
  const reviewArtifact = getArtifactForType(artifacts, "review");
  const milestoneNaming = getMilestoneRowNaming(milestoneArtifact);
  const nextMilestoneNaming = getNextMilestoneNaming(milestoneArtifact);
  const reviewNaming = getReviewNamingForMilestone(milestoneArtifact);

  return {
    canGenerateNextMilestone: canGenerateNextMilestone(
      milestoneArtifact,
      reviewArtifact
    ),
    milestoneSequenceNumber: milestoneNaming.sequenceNumber,
    nextMilestoneDisplayName: nextMilestoneNaming.displayName,
    rowNaming: {
      onboarding: getArtifactNaming("onboarding", 1),
      milestone: milestoneNaming,
      review: reviewNaming,
      env_manifest: getArtifactNaming("env_manifest", 1),
    },
    artifactThresholds: buildArtifactThresholds(domains),
  };
}

export async function listArtifactsForProject(
  supabase: SupabaseClient,
  projectId: string
): Promise<Artifact[]> {
  return getArtifactsForProject(supabase, projectId);
}

export async function getArtifactsWorkspaceForProject(
  supabase: SupabaseClient,
  projectId: string
): Promise<{ artifacts: Artifact[]; workspace: ArtifactsWorkspaceUi }> {
  const [artifacts, domains] = await Promise.all([
    getArtifactsForProject(supabase, projectId),
    getDomainsForProject(supabase, projectId),
  ]);

  return {
    artifacts,
    workspace: buildArtifactsWorkspaceUi(artifacts, domains),
  };
}

export async function streamArtifactGeneration(
  supabase: SupabaseClient,
  projectId: string,
  artifactType: ArtifactType,
  onChunk: (chunk: string) => void,
  options?: StreamArtifactOptions
): Promise<StreamArtifactResult> {
  const validation = await validateArtifactGeneration(
    supabase,
    projectId,
    artifactType
  );

  if (!validation.valid) {
    throw new Error(
      `Missing required domains: ${validation.missing_domains.join(", ")}`
    );
  }

  if (options?.nextMilestone) {
    const milestoneArtifact = await getArtifactByType(
      supabase,
      projectId,
      "milestone"
    );
    const reviewArtifact = await getArtifactByType(
      supabase,
      projectId,
      "review"
    );

    if (!canGenerateNextMilestone(milestoneArtifact, reviewArtifact)) {
      throw new Error(
        "Generate the review for the current milestone before starting the next one."
      );
    }
  }

  const existingArtifact = await getArtifactByType(
    supabase,
    projectId,
    artifactType
  );
  const reviewSequence = await getReviewSequenceNumber(
    supabase,
    projectId,
    options
  );
  const sequenceNumber = resolveSequenceNumber(
    artifactType,
    existingArtifact,
    reviewSequence,
    options
  );
  const prompts = await buildPromptsForArtifact(
    supabase,
    projectId,
    artifactType,
    sequenceNumber,
    options?.reviewContext
  );

  let content = "";
  let isPartial = false;

  try {
    const streamResult = await streamClaude(
      prompts.systemPrompt,
      prompts.userPrompt,
      onChunk
    );

    content = streamResult.text;
    isPartial = !streamResult.completed;
  } catch (error) {
    if (existingArtifact?.content && options?.regenerate) {
      throw new Error(
        "Something went wrong generating this artifact. Please try again."
      );
    }

    if (existingArtifact?.content && !options?.nextMilestone) {
      throw new Error(
        "Something went wrong generating this artifact. Please try again."
      );
    }

    console.error("Artifact generation error:", error);
    throw new Error(
      "Something went wrong generating this artifact. Please try again."
    );
  }

  const artifact = await upsertArtifact(supabase, {
    project_id: projectId,
    artifact_type: artifactType,
    content,
    status: isPartial ? "partial" : "generated",
    sequence_number: sequenceNumber,
  });

  return { content, artifact, isPartial };
}
