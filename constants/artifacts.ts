import type { ArtifactType, DomainName } from "@/lib/types";

export const ARTIFACT_DOMAIN_REQUIREMENTS: Record<
  ArtifactType,
  DomainName[]
> = {
  onboarding: ["product", "architecture", "tech_stack"],
  milestone: ["product", "scope", "architecture", "engineering_rules"],
  review: ["architecture", "engineering_rules"],
  env_manifest: ["tech_stack", "deployment"],
};

export interface ArtifactDefinition {
  type: ArtifactType;
  title: string;
  description: string;
}

export const ARTIFACT_DEFINITIONS: ArtifactDefinition[] = [
  {
    type: "onboarding",
    title: "ONBOARDING.md",
    description:
      "Persistent project bible Cursor reads at the start of every session.",
  },
  {
    type: "milestone",
    title: "MILESTONE_XX.md",
    description:
      "Single build session directive — one change, one Cursor session.",
  },
  {
    type: "review",
    title: "REVIEW_XX.md",
    description:
      "Self-audit template for Cursor to complete after a milestone.",
  },
  {
    type: "env_manifest",
    title: "ENV_MANIFEST.md",
    description:
      "Every service, credential, and env var required before npm run dev.",
  },
];

export function getArtifactFilename(
  artifactType: ArtifactType,
  sequenceNumber: number
): string {
  if (artifactType === "onboarding") {
    return "ONBOARDING.md";
  }

  if (artifactType === "env_manifest") {
    return "ENV_MANIFEST.md";
  }

  const padded = String(sequenceNumber).padStart(2, "0");

  if (artifactType === "milestone") {
    return `MILESTONE_${padded}.md`;
  }

  return `REVIEW_${padded}.md`;
}

