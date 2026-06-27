import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Domain, Project, Round } from "@/lib/types";

const {
  callClaude,
  createRound,
  getDomainByName,
  getPendingRoundForDomain,
  getProjectById,
  getRoundById,
  getRoundsForDomain,
  getRoundsForProject,
  unlockDomain,
  updateDomainData,
  updateDomainStatus,
  updateRound,
} = vi.hoisted(() => ({
  getPendingRoundForDomain: vi.fn(),
  getProjectById: vi.fn(),
  getRoundsForProject: vi.fn(),
  getRoundsForDomain: vi.fn(),
  getRoundById: vi.fn(),
  createRound: vi.fn(),
  updateRound: vi.fn(),
  getDomainByName: vi.fn(),
  updateDomainStatus: vi.fn(),
  updateDomainData: vi.fn(),
  unlockDomain: vi.fn(),
  callClaude: vi.fn(),
}));

vi.mock("@/lib/data/rounds", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/data/rounds")>();
  return {
    ...actual,
    createRound,
    deleteRound: vi.fn(),
    getPendingRoundForDomain,
    getPendingRoundsForProject: vi.fn(),
    getRoundById,
    getRoundsForDomain,
    getRoundsForProject,
    updateRound,
  };
});

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
  unlockDomain,
  updateDomainData,
  updateDomainStatus,
}));

vi.mock("@/lib/claude/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/claude/client")>();
  return {
    ...actual,
    callClaude,
  };
});

import { evaluateRound, generateRound } from "@/lib/services/roundService";

const mockSupabase = {} as SupabaseClient;
const projectId = "123e4567-e89b-12d3-a456-426614174000";
const roundId = "123e4567-e89b-12d3-a456-426614174002";

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
const mockAnswers = [{ question_id: "q1", answer: "A todo app for developers" }];

const architectureDomain: Domain = {
  id: "123e4567-e89b-12d3-a456-426614174003",
  project_id: projectId,
  name: "architecture",
  status: "locked",
  data: {},
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

function makeRound(overrides: Partial<Round> = {}): Round {
  return {
    id: roundId,
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

function setupEvaluateBaseMocks(currentRound = makeRound()) {
  getProjectById.mockResolvedValue(mockProject);
  getRoundById.mockResolvedValue(currentRound);
  updateRound.mockResolvedValue({ ...currentRound, status: "answered" });
  getRoundsForProject.mockResolvedValue([currentRound]);
  getDomainByName.mockResolvedValue(null);
  updateDomainData.mockResolvedValue(architectureDomain);
  unlockDomain.mockResolvedValue(undefined);
  updateDomainStatus.mockResolvedValue(architectureDomain);
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

describe("evaluateRound", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("evaluates answers and returns advance action", async () => {
    setupEvaluateBaseMocks();
    const domainRecord: Domain = {
      id: "123e4567-e89b-12d3-a456-426614174010",
      project_id: projectId,
      name: "product",
      status: "in_progress",
      data: {},
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };
    callClaude.mockResolvedValue(
      JSON.stringify({
        action: "advance",
        domains_affected: ["architecture"],
        domain_updates: {
          architecture: { pattern: "monolith" },
        },
      })
    );
    getDomainByName.mockResolvedValue(domainRecord);

    const result = await evaluateRound(
      mockSupabase,
      projectId,
      "product",
      roundId,
      mockAnswers
    );

    expect(result.action).toBe("advance");
    expect(result.round).toBeNull();
    expect(result.domains_affected).toContain("architecture");
    expect(updateRound).toHaveBeenCalledOnce();
    expect(updateDomainStatus).toHaveBeenCalledWith(
      mockSupabase,
      domainRecord.id,
      "complete"
    );
  });

  it("evaluates answers and returns follow_up with new questions", async () => {
    setupEvaluateBaseMocks();
    const followUpQuestions = [{ id: "q2", text: "Who is the primary user?" }];
    callClaude.mockResolvedValue(
      JSON.stringify({
        action: "follow_up",
        follow_up_questions: followUpQuestions,
        domains_affected: [],
        domain_updates: {},
      })
    );
    getRoundsForDomain.mockResolvedValue([makeRound()]);
    createRound.mockResolvedValue(
      makeRound({
        id: "123e4567-e89b-12d3-a456-426614174004",
        round_number: 2,
        questions: followUpQuestions.map((question) => ({
          ...question,
          follow_up: true,
        })),
      })
    );

    const result = await evaluateRound(
      mockSupabase,
      projectId,
      "product",
      roundId,
      mockAnswers
    );

    expect(result.action).toBe("follow_up");
    expect(result.round).toBeDefined();
    expect(result.round?.questions).toHaveLength(1);
    expect(createRound).toHaveBeenCalledOnce();
  });

  it("applies domain updates to affected domains on advance", async () => {
    setupEvaluateBaseMocks();
    const architectureUpdates = { pattern: "monolith", database: "postgres" };
    callClaude.mockResolvedValue(
      JSON.stringify({
        action: "advance",
        domains_affected: ["architecture"],
        domain_updates: {
          architecture: architectureUpdates,
        },
      })
    );
    getDomainByName.mockImplementation(
      async (_supabase, _projectId, name: string) => {
        if (name === "architecture") {
          return architectureDomain;
        }
        if (name === "product") {
          return {
            id: "123e4567-e89b-12d3-a456-426614174010",
            project_id: projectId,
            name: "product",
            status: "in_progress",
            data: {},
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:00:00.000Z",
          };
        }
        return null;
      }
    );

    await evaluateRound(
      mockSupabase,
      projectId,
      "product",
      roundId,
      mockAnswers
    );

    expect(updateDomainData).toHaveBeenCalledWith(
      mockSupabase,
      architectureDomain.id,
      architectureUpdates
    );
    expect(unlockDomain).toHaveBeenCalledWith(
      mockSupabase,
      projectId,
      "architecture"
    );
  });

  it("throws when Claude returns malformed JSON", async () => {
    setupEvaluateBaseMocks();
    callClaude.mockResolvedValue("not valid json {{{");

    await expect(
      evaluateRound(mockSupabase, projectId, "product", roundId, mockAnswers)
    ).rejects.toThrow(
      "Something went wrong evaluating answers. Please try again."
    );

    expect(createRound).not.toHaveBeenCalled();
  });

  it("throws when round does not exist", async () => {
    getProjectById.mockResolvedValue(mockProject);
    getRoundById.mockResolvedValue(null);

    await expect(
      evaluateRound(
        mockSupabase,
        projectId,
        "product",
        "non-existent-id",
        mockAnswers
      )
    ).rejects.toThrow("Round not found");

    expect(callClaude).not.toHaveBeenCalled();
    expect(updateRound).not.toHaveBeenCalled();
  });
});
