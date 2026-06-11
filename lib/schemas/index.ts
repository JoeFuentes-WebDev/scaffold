import { NextResponse } from "next/server";
import { z } from "zod";

export const DomainNameSchema = z.enum([
  "product",
  "scope",
  "users",
  "architecture",
  "tech_stack",
  "domain_model",
  "engineering_rules",
  "deployment",
]);

export const ColdStartSeedAnswersSchema = z.object({
  what_it_does: z.string().trim().min(1, "What does it do? is required"),
  who_it_is_for: z.string().trim().min(1, "Who is it for? is required"),
  v1_boundary: z.string().trim().min(1, "What is the V1 boundary? is required"),
});

export const CreateProjectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required"),
  description: z.string().trim().optional(),
  project_type: z.enum(["new", "existing"]).default("new"),
  seed_answers: ColdStartSeedAnswersSchema,
});

export const UpdateProjectSchema = z.object({
  description: z.string().trim().min(1, "description is required"),
});

export const RegeneratePendingSchema = z.object({
  domain_names: z.array(DomainNameSchema).min(1, "domain_names is required"),
});

export const ProjectIdQuerySchema = z.object({
  project_id: z.string().uuid(),
});

export const GetRoundsQuerySchema = z.object({
  project_id: z.string().uuid(),
  domain_name: DomainNameSchema,
});

export const GenerateRoundSchema = z.object({
  project_id: z.string().uuid(),
  domain_name: DomainNameSchema,
});

export const EvaluateAnswerSchema = z.object({
  question_id: z.string().trim().min(1),
  answer: z.string().trim().min(1),
});

export const EvaluateRoundSchema = z.object({
  project_id: z.string().uuid(),
  domain_name: DomainNameSchema,
  round_id: z.string().uuid(),
  answers: z.array(EvaluateAnswerSchema).min(1, "answers are required"),
});

export const RegenerateRoundSchema = z.object({
  project_id: z.string().uuid(),
  domain_name: DomainNameSchema,
  round_id: z.string().uuid(),
});

export const ClarifyRoundSchema = z.object({
  project_id: z.string().uuid(),
  domain_name: DomainNameSchema,
  clarification: z.string().trim().min(1, "clarification is required"),
});

export const ArtifactTypeSchema = z.enum([
  "onboarding",
  "milestone",
  "review",
  "env_manifest",
]);

export const GenerateArtifactSchema = z.object({
  project_id: z.string().uuid(),
  artifact_type: ArtifactTypeSchema,
  regenerate: z.boolean().optional(),
  next_milestone: z.boolean().optional(),
  review_context: z
    .object({
      completed_review: z.string().trim().min(1),
      open_question_answers: z
        .array(
          z.object({
            question: z.string().trim().min(1),
            answer: z.string().trim().min(1),
          })
        )
        .optional(),
    })
    .optional(),
});

export const UpdateDomainStatusSchema = z.object({
  status: z.enum(["locked", "available", "in_progress", "complete"]),
});

export const CheckUnlocksSchema = z.object({
  project_id: z.string().uuid(),
});

export function invalidRequestResponse(error: z.ZodError) {
  return NextResponse.json(
    { error: "Invalid request", details: error.flatten() },
    { status: 400 }
  );
}
