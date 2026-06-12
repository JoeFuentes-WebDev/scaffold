import { describe, expect, it } from "vitest";

import {
  getMissingDomainsForArtifact,
  isArtifactReady,
} from "@/lib/services/domainThresholds";
import type { Domain, DomainName, DomainStatus } from "@/lib/types";

function makeDomain(name: DomainName, status: DomainStatus): Domain {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    project_id: "00000000-0000-4000-8000-000000000000",
    name,
    status,
    data: {},
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

describe("isArtifactReady", () => {
  it("returns ready for ONBOARDING when required domains are complete", () => {
    const domains = [
      makeDomain("product", "complete"),
      makeDomain("architecture", "complete"),
      makeDomain("tech_stack", "complete"),
      makeDomain("scope", "in_progress"),
    ];

    expect(isArtifactReady(domains, "onboarding")).toBe(true);
  });

  it("returns not ready for ONBOARDING when architecture is not complete", () => {
    const domains = [
      makeDomain("product", "complete"),
      makeDomain("architecture", "in_progress"),
      makeDomain("tech_stack", "complete"),
    ];

    expect(isArtifactReady(domains, "onboarding")).toBe(false);
  });

  it("returns ready for milestone when all four required domains are complete", () => {
    const domains = [
      makeDomain("product", "complete"),
      makeDomain("scope", "complete"),
      makeDomain("architecture", "complete"),
      makeDomain("engineering_rules", "complete"),
    ];

    expect(isArtifactReady(domains, "milestone")).toBe(true);
  });

  it("returns ready for env_manifest when tech_stack and deployment are complete", () => {
    const domains = [
      makeDomain("tech_stack", "complete"),
      makeDomain("deployment", "complete"),
    ];

    expect(isArtifactReady(domains, "env_manifest")).toBe(true);
  });
});

describe("getMissingDomainsForArtifact", () => {
  it("returns missing domain names for ONBOARDING", () => {
    const domains = [
      makeDomain("product", "complete"),
      makeDomain("architecture", "in_progress"),
      makeDomain("tech_stack", "locked"),
    ];

    const missing = getMissingDomainsForArtifact(domains, "onboarding");

    expect(missing).toContain("architecture");
    expect(missing).toContain("tech_stack");
    expect(missing).not.toContain("product");
  });
});
