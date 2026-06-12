import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Domain, DomainName, DomainStatus, Project } from "@/lib/types";

const mockSupabase = {} as SupabaseClient;

const {
  callClaude,
  createClient,
  getDomainByName,
  getDomainsForProject,
  getProjectById,
  getRoundsForProject,
  unlockDomain,
  updateDomainStatus,
} = vi.hoisted(() => ({
  createClient: vi.fn(),
  getProjectById: vi.fn(),
  getDomainsForProject: vi.fn(),
  getRoundsForProject: vi.fn(),
  getDomainByName: vi.fn(),
  unlockDomain: vi.fn(),
  updateDomainStatus: vi.fn(),
  callClaude: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient,
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
  getDomainsForProject,
  isValidDomainName: vi.fn(),
  unlockDomain,
  updateDomainData: vi.fn(),
  updateDomainStatus,
}));

vi.mock("@/lib/data/rounds", () => ({
  getRoundsForProject,
  createRound: vi.fn(),
  deleteRound: vi.fn(),
  getPendingRoundForDomain: vi.fn(),
  getPendingRoundsForProject: vi.fn(),
  getRoundById: vi.fn(),
  getRoundsForDomain: vi.fn(),
  mergeAnswersIntoQuestions: vi.fn(),
  updateRound: vi.fn(),
}));

vi.mock("@/lib/claude/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/claude/client")>();
  return {
    ...actual,
    callClaude,
  };
});

import { checkDomainUnlocks } from "@/lib/services/domainService";

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

function makeDomain(name: DomainName, status: DomainStatus): Domain {
  return {
    id: `123e4567-e89b-12d3-a456-42661417${name.length}${name.charCodeAt(0)}`,
    project_id: projectId,
    name,
    status,
    data: {},
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

function setupProjectMocks() {
  createClient.mockResolvedValue(mockSupabase);
  getProjectById.mockResolvedValue(mockProject);
  getRoundsForProject.mockResolvedValue([]);
  unlockDomain.mockResolvedValue(undefined);
  updateDomainStatus.mockImplementation(
    async (_supabase, _id, status: DomainStatus) =>
      makeDomain("scope", status)
  );
}

describe("checkDomainUnlocks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupProjectMocks();
  });

  it("unlocks domains Claude identifies as having enough context", async () => {
    const scopeDomain = makeDomain("scope", "locked");
    const usersDomain = makeDomain("users", "locked");
    const initialDomains = [scopeDomain, usersDomain];

    getDomainsForProject
      .mockResolvedValueOnce(initialDomains)
      .mockResolvedValueOnce([
        makeDomain("scope", "available"),
        usersDomain,
      ]);
    getDomainByName.mockImplementation(
      async (_supabase, _projectId, name: string) => {
        if (name === "scope") {
          return scopeDomain;
        }
        return usersDomain;
      }
    );
    callClaude.mockResolvedValue(
      JSON.stringify({ domains_to_unlock: ["scope"] })
    );

    const result = await checkDomainUnlocks(projectId);

    expect(unlockDomain).toHaveBeenCalledWith(
      mockSupabase,
      projectId,
      "scope"
    );
    expect(unlockDomain).not.toHaveBeenCalledWith(
      mockSupabase,
      projectId,
      "users"
    );
    expect(result.unlocked_domains).toEqual(["scope"]);
  });

  it("does not call Claude when no locked domains exist", async () => {
    getDomainsForProject.mockResolvedValue([
      makeDomain("product", "complete"),
      makeDomain("scope", "available"),
    ]);

    const result = await checkDomainUnlocks(projectId);

    expect(callClaude).not.toHaveBeenCalled();
    expect(unlockDomain).not.toHaveBeenCalled();
    expect(result.unlocked_domains).toEqual([]);
  });

  it("unlocks nothing when Claude returns empty array", async () => {
    getDomainsForProject.mockResolvedValue([
      makeDomain("scope", "locked"),
      makeDomain("users", "locked"),
    ]);
    callClaude.mockResolvedValue(
      JSON.stringify({ domains_to_unlock: [] })
    );

    const result = await checkDomainUnlocks(projectId);

    expect(unlockDomain).not.toHaveBeenCalled();
    expect(updateDomainStatus).not.toHaveBeenCalled();
    expect(result.unlocked_domains).toEqual([]);
  });

  it("throws when Claude returns malformed JSON", async () => {
    getDomainsForProject.mockResolvedValue([makeDomain("scope", "locked")]);
    callClaude.mockResolvedValue("not valid json {{{");

    await expect(checkDomainUnlocks(projectId)).rejects.toThrow(
      "Something went wrong checking domain unlocks. Please try again."
    );

    expect(unlockDomain).not.toHaveBeenCalled();
    expect(updateDomainStatus).not.toHaveBeenCalled();
  });

  it("does not unlock domains that are already available or in_progress", async () => {
    const scopeDomain = makeDomain("scope", "locked");
    const usersDomain = makeDomain("users", "available");
    const architectureDomain = makeDomain("architecture", "in_progress");

    getDomainsForProject
      .mockResolvedValueOnce([scopeDomain, usersDomain, architectureDomain])
      .mockResolvedValueOnce([
        makeDomain("scope", "available"),
        usersDomain,
        architectureDomain,
      ]);
    getDomainByName.mockImplementation(
      async (_supabase, _projectId, name: string) => {
        if (name === "scope") {
          return scopeDomain;
        }
        if (name === "users") {
          return usersDomain;
        }
        if (name === "architecture") {
          return architectureDomain;
        }
        return null;
      }
    );
    callClaude.mockResolvedValue(
      JSON.stringify({
        domains_to_unlock: ["scope", "users", "architecture"],
      })
    );

    const result = await checkDomainUnlocks(projectId);

    expect(unlockDomain).toHaveBeenCalledTimes(1);
    expect(unlockDomain).toHaveBeenCalledWith(
      mockSupabase,
      projectId,
      "scope"
    );
    expect(result.unlocked_domains).toEqual(["scope"]);
  });
});
