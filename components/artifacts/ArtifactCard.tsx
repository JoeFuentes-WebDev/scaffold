import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ArtifactDefinition } from "@/constants/artifacts";
import {
  formatDomainList,
  formatRequiredDomainsList,
  getMissingDomainsForArtifact,
  isArtifactReady,
} from "@/lib/documents/thresholds";
import type { Artifact, Domain } from "@/lib/types";

interface ArtifactCardProps {
  definition: ArtifactDefinition;
  domains: Domain[];
  artifact: Artifact | null;
  isGenerating: boolean;
  onGenerate: () => void;
}

function formatGeneratedDate(dateString: string | undefined): string | null {
  if (!dateString) {
    return null;
  }

  return new Date(dateString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ArtifactCard({
  definition,
  domains,
  artifact,
  isGenerating,
  onGenerate,
}: ArtifactCardProps) {
  const isReady = isArtifactReady(domains, definition.type);
  const missingDomainNames = getMissingDomainsForArtifact(
    domains,
    definition.type
  );
  const missingLabel = formatDomainList(missingDomainNames);
  const requiredLabel = formatRequiredDomainsList(definition.type);
  const generatedDate = formatGeneratedDate(artifact?.updated_at);
  const hasExistingArtifact =
    artifact?.content &&
    (artifact.status === "generated" || artifact.status === "partial");
  const buttonLabel = hasExistingArtifact ? "Regenerate" : "Generate";

  function renderGenerateButton() {
    if (isReady) {
      return (
        <Button disabled={isGenerating} onClick={onGenerate} type="button">
          {isGenerating ? "Generating..." : buttonLabel}
        </Button>
      );
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <Button disabled type="button" variant="outline">
              {buttonLabel}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Missing: {missingLabel}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Card className="border-[#E5E7EB] bg-white">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base text-[#111827]">
            {definition.title}
          </CardTitle>
          <Badge variant={isReady ? "default" : "secondary"}>
            {isReady ? "Ready" : "Not ready"}
          </Badge>
        </div>
        <CardDescription className="text-[#6B7280]">
          {definition.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-[#6B7280]">
          Requires: {requiredLabel}
        </p>
        {!isReady ? (
          <p className="text-xs text-[#6B7280]">Missing: {missingLabel}</p>
        ) : (
          <p className="text-xs text-green-600">Ready to Generate</p>
        )}
        {generatedDate ? (
          <p className="text-xs text-[#6B7280]">
            Last generated: {generatedDate}
            {artifact?.status === "partial" ? " (partial)" : ""}
          </p>
        ) : null}
        {renderGenerateButton()}
      </CardContent>
    </Card>
  );
}
