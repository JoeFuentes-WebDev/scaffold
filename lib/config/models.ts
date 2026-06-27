export const ARTIFACT_MODELS: Record<string, string> = {
  onboarding: "claude-sonnet-4-6",
  milestone: "claude-sonnet-4-6",
  review: "claude-sonnet-4-6",
  env_manifest: "claude-sonnet-4-6",
};

export const DEFAULT_MODEL = "claude-sonnet-4-6";

export function getModelForArtifact(artifactType: string): string {
  return ARTIFACT_MODELS[artifactType] ?? DEFAULT_MODEL;
}
