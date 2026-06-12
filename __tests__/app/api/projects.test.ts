import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, createProject } = vi.hoisted(() => ({
  createClient: vi.fn(),
  createProject: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient,
}));

vi.mock("@/lib/services/projectService", () => ({
  createProject,
}));

import { POST } from "@/app/api/projects/route";

const validSeedAnswers = {
  what_it_does: "A test app",
  who_it_is_for: "Developers",
  v1_boundary: "Basic CRUD only",
};

function setupAuth() {
  createClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "test-user-id" } },
        error: null,
      }),
    },
  });
}

describe("POST /api/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
  });

  it("creates a project and returns project_id", async () => {
    createProject.mockResolvedValue({ project_id: "new-project-id" });

    const request = new Request("http://localhost/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Project",
        seed_answers: validSeedAnswers,
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.project_id).toBe("new-project-id");
    expect(createProject).toHaveBeenCalledWith("test-user-id", {
      name: "Test Project",
      description: undefined,
      seed_answers: validSeedAnswers,
      project_type: "new",
    });
  });

  it("returns 400 when project name is missing", async () => {
    const request = new Request("http://localhost/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "",
        seed_answers: {
          what_it_does: "x",
          who_it_is_for: "y",
          v1_boundary: "z",
        },
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(createProject).not.toHaveBeenCalled();
  });

  it("returns 500 with service error message when service throws", async () => {
    createProject.mockRejectedValue(new Error("DB connection failed"));

    const request = new Request("http://localhost/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test",
        seed_answers: {
          what_it_does: "x",
          who_it_is_for: "y",
          v1_boundary: "z",
        },
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("DB connection failed");
  });
});
