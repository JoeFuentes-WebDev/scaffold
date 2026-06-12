import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSupabase = {} as SupabaseClient;

const {
  getAuthenticatedSupabase,
  streamArtifactGeneration,
  validateArtifactGeneration,
  verifyProjectAccess,
} = vi.hoisted(() => ({
  getAuthenticatedSupabase: vi.fn(),
  verifyProjectAccess: vi.fn(),
  validateArtifactGeneration: vi.fn(),
  streamArtifactGeneration: vi.fn(),
}));

vi.mock("@/lib/services/authService", () => ({
  getAuthenticatedSupabase,
}));

vi.mock("@/lib/services/projectAccessService", () => ({
  verifyProjectAccess,
}));

vi.mock("@/lib/services/artifactService", () => ({
  validateArtifactGeneration,
  streamArtifactGeneration,
}));

import { POST } from "@/app/api/artifacts/generate/route";

const projectId = "123e4567-e89b-12d3-a456-426614174000";

function setupAuth() {
  getAuthenticatedSupabase.mockResolvedValue({
    supabase: mockSupabase,
    user: { id: "test-user-id" },
  });
  verifyProjectAccess.mockResolvedValue(true);
}

describe("POST /api/artifacts/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
  });

  it("returns 400 for invalid artifact_type", async () => {
    const request = new Request("http://localhost/api/artifacts/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: projectId,
        artifact_type: "invalid_type",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(validateArtifactGeneration).not.toHaveBeenCalled();
    expect(streamArtifactGeneration).not.toHaveBeenCalled();
  });

  it("returns 400 when required domains are not complete", async () => {
    validateArtifactGeneration.mockResolvedValue({
      valid: false,
      missing_domains: ["architecture", "tech_stack"],
    });

    const request = new Request("http://localhost/api/artifacts/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: projectId,
        artifact_type: "onboarding",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Required domains are not complete");
    expect(body.missing_domains).toEqual(["architecture", "tech_stack"]);
    expect(streamArtifactGeneration).not.toHaveBeenCalled();
  });
});
