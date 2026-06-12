import { describe, expect, it } from "vitest";

import {
  CreateProjectSchema,
  EvaluateRoundSchema,
  GenerateArtifactSchema,
  GenerateRoundSchema,
} from "@/lib/schemas";

describe("CreateProjectSchema", () => {
  it("rejects empty project name", () => {
    const result = CreateProjectSchema.safeParse({
      name: "",
      seed_answers: {
        what_it_does: "something",
        who_it_is_for: "someone",
        v1_boundary: "something",
      },
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid project creation input", () => {
    const result = CreateProjectSchema.safeParse({
      name: "My Project",
      seed_answers: {
        what_it_does: "A todo app",
        who_it_is_for: "Individual developers",
        v1_boundary: "V1: basic CRUD only",
      },
    });

    expect(result.success).toBe(true);
  });
});

describe("GenerateRoundSchema", () => {
  it("rejects invalid project_id UUID", () => {
    const result = GenerateRoundSchema.safeParse({
      project_id: "not-a-uuid",
      domain_name: "product",
    });

    expect(result.success).toBe(false);
  });
});

describe("EvaluateRoundSchema", () => {
  it("rejects empty answers array", () => {
    const result = EvaluateRoundSchema.safeParse({
      project_id: "123e4567-e89b-12d3-a456-426614174000",
      domain_name: "product",
      round_id: "123e4567-e89b-12d3-a456-426614174001",
      answers: [],
    });

    expect(result.success).toBe(false);
  });
});

describe("GenerateArtifactSchema", () => {
  it("rejects invalid artifact type", () => {
    const result = GenerateArtifactSchema.safeParse({
      project_id: "123e4567-e89b-12d3-a456-426614174000",
      artifact_type: "invalid_type",
    });

    expect(result.success).toBe(false);
  });
});
