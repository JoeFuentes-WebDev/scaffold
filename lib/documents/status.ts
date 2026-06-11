import { ARTIFACT_DOMAIN_REQUIREMENTS } from "@/constants/artifacts";
import type { Domain, DomainStatus } from "@/lib/types";

export function getDocumentsTabStatus(domains: Domain[]): DomainStatus {
  const artifactRequirements = Object.values(ARTIFACT_DOMAIN_REQUIREMENTS);
  const hasUnlockableArtifact = artifactRequirements.some((requiredDomains) =>
    requiredDomains.every((domainName) => {
      const domain = domains.find((item) => item.name === domainName);
      return domain?.status === "complete";
    })
  );

  return hasUnlockableArtifact ? "available" : "locked";
}
