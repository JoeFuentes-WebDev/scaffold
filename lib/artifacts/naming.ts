import type { Artifact, ArtifactType } from "@/lib/types";

import { getArtifactFilename } from "@/constants/artifacts";

export interface ArtifactNaming {
  displayName: string;
  filename: string;
  sequenceNumber: number;
}

export function getArtifactDisplayName(
  artifactType: ArtifactType,
  sequenceNumber: number
): string {
  return getArtifactFilename(artifactType, sequenceNumber);
}

export function getArtifactNaming(
  artifactType: ArtifactType,
  sequenceNumber: number
): ArtifactNaming {
  const filename = getArtifactFilename(artifactType, sequenceNumber);

  return {
    displayName: filename,
    filename,
    sequenceNumber,
  };
}

export function getMilestoneReviewSequenceNumber(
  milestoneArtifact: Artifact | null
): number {
  if (!milestoneArtifact?.sequence_number) {
    return 1;
  }

  return milestoneArtifact.sequence_number;
}

export function getNextMilestoneSequenceNumber(
  milestoneArtifact: Artifact | null
): number {
  if (!milestoneArtifact?.content) {
    return 1;
  }

  return (milestoneArtifact.sequence_number ?? 1) + 1;
}

export function hasGeneratedMilestone(milestoneArtifact: Artifact | null): boolean {
  return Boolean(
    milestoneArtifact?.content &&
      (milestoneArtifact.status === "generated" ||
        milestoneArtifact.status === "partial")
  );
}

export function hasGeneratedReview(reviewArtifact: Artifact | null): boolean {
  return Boolean(
    reviewArtifact?.content && reviewArtifact.status === "generated"
  );
}

export function canGenerateNextMilestone(
  milestoneArtifact: Artifact | null,
  reviewArtifact: Artifact | null
): boolean {
  if (!milestoneArtifact?.content || milestoneArtifact.status !== "generated") {
    return false;
  }

  if (!hasGeneratedReview(reviewArtifact)) {
    return false;
  }

  return (
    reviewArtifact!.sequence_number === (milestoneArtifact.sequence_number ?? 1)
  );
}

export function getReviewNamingForMilestone(
  milestoneArtifact: Artifact | null
): ArtifactNaming {
  const sequenceNumber = getMilestoneReviewSequenceNumber(milestoneArtifact);
  return getArtifactNaming("review", sequenceNumber);
}

export function getMilestoneRowNaming(
  milestoneArtifact: Artifact | null
): ArtifactNaming {
  if (hasGeneratedMilestone(milestoneArtifact)) {
    return getArtifactNaming(
      "milestone",
      milestoneArtifact!.sequence_number ?? 1
    );
  }

  return getArtifactNaming("milestone", 1);
}

export function getNextMilestoneNaming(
  milestoneArtifact: Artifact | null
): ArtifactNaming {
  const sequenceNumber = getNextMilestoneSequenceNumber(milestoneArtifact);
  return getArtifactNaming("milestone", sequenceNumber);
}
