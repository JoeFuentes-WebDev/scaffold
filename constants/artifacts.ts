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
