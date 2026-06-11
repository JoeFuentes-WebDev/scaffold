import { ARTIFACT_DOMAIN_REQUIREMENTS } from "@/constants/artifacts";
import { DOMAIN_DEFINITIONS } from "@/constants/domains";
import type { ArtifactType, Domain, DomainName } from "@/lib/types";

export function getMissingDomainsForArtifact(
  domains: Domain[],
  artifactType: ArtifactType
): DomainName[] {
  const required = ARTIFACT_DOMAIN_REQUIREMENTS[artifactType];

  return required.filter((domainName) => {
    const domain = domains.find((item) => item.name === domainName);
    return domain?.status !== "complete";
  });
}

export function isArtifactReady(
  domains: Domain[],
  artifactType: ArtifactType
): boolean {
  return getMissingDomainsForArtifact(domains, artifactType).length === 0;
}

export function formatDomainList(domainNames: DomainName[]): string {
  return domainNames
    .map((name) => {
      const match = DOMAIN_DEFINITIONS.find((item) => item.name === name);
      return match?.label ?? name;
    })
    .join(", ");
}

export function formatRequiredDomainsList(artifactType: ArtifactType): string {
  return formatDomainList(ARTIFACT_DOMAIN_REQUIREMENTS[artifactType]);
}
