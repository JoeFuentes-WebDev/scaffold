import type { ColdStartSeedAnswers } from "@/lib/types";

export const COLD_START_SEED_QUESTIONS = [
  { key: "what_it_does", label: "What does it do?" },
  { key: "who_it_is_for", label: "Who is it for?" },
  { key: "v1_boundary", label: "What is the V1 boundary?" },
] as const satisfies ReadonlyArray<{
  key: keyof ColdStartSeedAnswers;
  label: string;
}>;

export function buildProjectDescription(
  seedAnswers: ColdStartSeedAnswers,
  optionalDescription?: string
): string {
  const parts: string[] = [];

  if (optionalDescription?.trim()) {
    parts.push(optionalDescription.trim(), "");
  }

  for (const question of COLD_START_SEED_QUESTIONS) {
    parts.push(question.label, seedAnswers[question.key].trim(), "");
  }

  return parts.join("\n").trim();
}

export function validateColdStartSeedAnswers(
  seedAnswers: Partial<ColdStartSeedAnswers> | undefined
): string | null {
  if (!seedAnswers) {
    return "Seed answers are required";
  }

  for (const question of COLD_START_SEED_QUESTIONS) {
    if (!seedAnswers[question.key]?.trim()) {
      return `${question.label} is required`;
    }
  }

  return null;
}
