import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Project, Round } from "@/lib/types";

const {
  callClaude,
  createRound,
  getDomainByName,
  getPendingRoundForDomain,
  getProjectById,
  getRoundsForDomain,
  getRoundsForProject,
  updateDomainStatus,
} = vi.hoisted(() => ({
  getPendingRoundForDomain: vi.fn(),
  getProjectById: vi.fn(),
  getRoundsForProject: vi.fn(),
  getRoundsForDomain: vi.fn(),
  createRound: vi.fn(),
  getDomainByName: vi.fn(),
  updateDomainStatus: vi.fn(),
  callClaude: vi.fn(),
}));

vi.mock("@/lib/data/rounds", () => ({
  createRound,
  deleteRound: vi.fn(),
  getPendingRoundForDomain,
  getPendingRoundsForProject: vi.fn(),
  getRoundById: vi.fn(),
  getRoundsForDomain,
  getRoundsForProject,
  mergeAnswersIntoQuestions: vi.fn(),
  updateRound: vi.fn(),
}));

vi.mock("@/lib/data/projects", () => ({
  getProjectById,
  getProjectsByUserId: vi.fn(),
  insertDomainsForProject: vi.fn(),
  insertProject: vi.fn(),
  updateProject: vi.fn(),
}));

vi.mock("@/lib/data/domains", () => ({
  getDomainById: vi.fn(),
  getDomainByName,
  getDomainsByProjectId: vi.fn(),
  getDomainsForProject: vi.fn(),
  isValidDomainName: vi.fn(),
  unlockDomain: vi.fn(),
  updateDomainData: vi.fn(),
  updateDomainStatus,
}));

vi.mock("@/lib/claude/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/claude/client")>();
  return {
    ...actual,
    callClaude,
  };
});

import { generateRound } from "@/lib/services/roundService";

const mockSupabase = {} as SupabaseClient;
const projectId = "123e4567-e89b-12d3-a456-426614174000";

const mockProject: Project = {
  id: projectId,
  user_id: "123e4567-e89b-12d3-a456-426614174001",
  name: "Test Project",
  description: "A test project",
  project_type: "new",
  status: "active",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const mockQuestions = [{ id: "q1", text: "What does it do?" }];

function makeRound(overrides: Partial<Round> = {}): Round {
  return {
    id: "123e4567-e89b-12d3-a456-426614174002",
    project_id: projectId,
    domain_name: "product",
    round_number: 1,
    status: "pending",
    questions: mockQuestions,
    domains_affected: [],
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("generateRound", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates a round with questions from Claude", async () => {
    getPendingRoundForDomain.mockResolvedValue(null);
    getProjectById.mockResolvedValue(mockProject);
    getRoundsForProject.mockResolvedValue([]);
    getRoundsForDomain.mockResolvedValue([]);
    callClaude.mockResolvedValue(JSON.stringify({ questions: mockQuestions }));
    createRound.mockResolvedValue(makeRound());
    getDomainByName.mockResolvedValue(null);

    const result = await generateRound(mockSupabase, projectId, "product");

    expect(result.questions).toHaveLength(1);
    expect(result.status).toBe("pending");
    expect(result.domain_name).toBe("product");
    expect(createRound).toHaveBeenCalledOnce();
    expect(callClaude).toHaveBeenCalledOnce();
  });

  it("returns existing pending round without creating a new one", async () => {
    const existingRound = makeRound();
    getPendingRoundForDomain.mockResolvedValue(existingRound);

    const result = await generateRound(mockSupabase, projectId, "product");

    expect(createRound).not.toHaveBeenCalled();
    expect(callClaude).not.toHaveBeenCalled();
    expect(getProjectById).not.toHaveBeenCalled();
    expect(result.status).toBe("pending");
    expect(result).toBe(existingRound);
  });

  it("throws when Claude returns malformed JSON", async () => {
    getPendingRoundForDomain.mockResolvedValue(null);
    getProjectById.mockResolvedValue(mockProject);
    getRoundsForProject.mockResolvedValue([]);
    getRoundsForDomain.mockResolvedValue([]);
    callClaude.mockResolvedValue("not valid json {{{");

    await expect(
      generateRound(mockSupabase, projectId, "product")
    ).rejects.toThrow(
      "Something went wrong generating questions. Please try again."
    );

    expect(createRound).not.toHaveBeenCalled();
  });

  it("throws when project does not exist", async () => {
    getPendingRoundForDomain.mockResolvedValue(null);
    getProjectById.mockResolvedValue(null);

    await expect(
      generateRound(mockSupabase, "non-existent-id", "product")
    ).rejects.toThrow("Project not found");

    expect(callClaude).not.toHaveBeenCalled();
    expect(createRound).not.toHaveBeenCalled();
  });
});
