import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSupabase = {} as SupabaseClient;

const { generateRound, getAuthenticatedSupabase, verifyProjectAccess } =
  vi.hoisted(() => ({
    getAuthenticatedSupabase: vi.fn(),
    verifyProjectAccess: vi.fn(),
    generateRound: vi.fn(),
  }));

vi.mock("@/lib/services/authService", () => ({
  getAuthenticatedSupabase,
}));

vi.mock("@/lib/services/projectAccessService", () => ({
  verifyProjectAccess,
}));

vi.mock("@/lib/services/roundService", () => ({
  generateRound,
}));

import { POST } from "@/app/api/rounds/generate/route";

const projectId = "123e4567-e89b-12d3-a456-426614174000";

function setupAuth() {
  getAuthenticatedSupabase.mockResolvedValue({
    supabase: mockSupabase,
    user: { id: "test-user-id" },
  });
  verifyProjectAccess.mockResolvedValue(true);
}

describe("POST /api/rounds/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
  });

  it("generates a round and returns it", async () => {
    generateRound.mockResolvedValue({
      id: "round-id",
      project_id: projectId,
      domain_name: "product",
      round_number: 1,
      status: "pending",
      questions: [{ id: "q1", text: "What does it do?" }],
      domains_affected: [],
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    });

    const request = new Request("http://localhost/api/rounds/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: projectId,
        domain_name: "product",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.round.questions).toHaveLength(1);
    expect(generateRound).toHaveBeenCalledWith(
      mockSupabase,
      projectId,
      "product"
    );
  });

  it("returns 400 for invalid project_id UUID", async () => {
    const request = new Request("http://localhost/api/rounds/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: "not-a-uuid",
        domain_name: "product",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(generateRound).not.toHaveBeenCalled();
  });
});
