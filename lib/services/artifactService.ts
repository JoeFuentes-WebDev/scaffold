import type { SupabaseClient } from "@supabase/supabase-js";

import { streamClaude } from "@/lib/claude/client";
import { getArtifactByType, getArtifactsForProject, upsertArtifact } from "@/lib/data/artifacts";
import { getMissingDomainsForArtifact } from "@/lib/documents/thresholds";
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
import type { Artifact, ArtifactType, DomainName } from "@/lib/types";

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

function getSequenceNumber(
  artifactType: ArtifactType,
  existingArtifact: Artifact | null,
  milestoneSequence: number
): number {
  if (artifactType === "milestone") {
    if (existingArtifact?.sequence_number) {
      return existingArtifact.sequence_number;
    }

    return milestoneSequence;
  }

  if (artifactType === "review") {
    return milestoneSequence;
  }

  return 1;
}

async function getMilestoneSequenceNumber(
  supabase: SupabaseClient,
  projectId: string
): Promise<number> {
  const milestoneArtifact = await getArtifactByType(
    supabase,
    projectId,
    "milestone"
  );

  if (milestoneArtifact?.sequence_number) {
    return milestoneArtifact.sequence_number;
  }

  return 1;
}

async function buildPromptsForArtifact(
  supabase: SupabaseClient,
  projectId: string,
  artifactType: ArtifactType,
  sequenceNumber: number
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
      userPrompt: buildMilestoneUserPrompt(model, sequenceNumber),
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

export async function listArtifactsForProject(
  supabase: SupabaseClient,
  projectId: string
): Promise<Artifact[]> {
  return getArtifactsForProject(supabase, projectId);
}

export async function streamArtifactGeneration(
  supabase: SupabaseClient,
  projectId: string,
  artifactType: ArtifactType,
  onChunk: (chunk: string) => void
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

  const existingArtifact = await getArtifactByType(
    supabase,
    projectId,
    artifactType
  );
  const milestoneSequence = await getMilestoneSequenceNumber(
    supabase,
    projectId
  );
  const sequenceNumber = getSequenceNumber(
    artifactType,
    existingArtifact,
    milestoneSequence
  );
  const prompts = await buildPromptsForArtifact(
    supabase,
    projectId,
    artifactType,
    sequenceNumber
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
    if (existingArtifact?.content) {
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
