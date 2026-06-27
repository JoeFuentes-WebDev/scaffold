"use client";

import { ChevronDownIcon } from "lucide-react";

import { ArtifactPreview } from "@/components/artifacts/ArtifactPreview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ArtifactRowProps {
  displayName: string;
  description: string;
  secondaryLabel?: string;
  isReady: boolean;
  missingLabel: string;
  hasGeneratedContent: boolean;
  isExpandable?: boolean;
  isExpanded: boolean;
  isGenerating: boolean;
  previewContent: string;
  isPartial: boolean;
  isStreaming: boolean;
  generateLabel: string;
  showGenerateButton: boolean;
  onToggleExpand: () => void;
  onGenerate: () => void;
  onRegenerate: () => void;
  onDownload: () => void;
  gateContent?: React.ReactNode;
}

export function ArtifactRow({
  displayName,
  description,
  secondaryLabel,
  isReady,
  missingLabel,
  hasGeneratedContent,
  isExpandable,
  isExpanded,
  isGenerating,
  previewContent,
  isPartial,
  isStreaming,
  generateLabel,
  showGenerateButton,
  onToggleExpand,
  onGenerate,
  onRegenerate,
  onDownload,
  gateContent,
}: ArtifactRowProps) {
  const canExpand =
    isExpandable ?? (hasGeneratedContent || isStreaming);

  function handleRowClick() {
    if (canExpand) {
      onToggleExpand();
    }
  }

  function handleGenerateClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    onGenerate();
  }

  function handleRegenerateClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    onRegenerate();
  }

  function handleDownloadClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    onDownload();
  }

  function renderPrimaryButton() {
    if (!showGenerateButton) {
      return null;
    }

    if (hasGeneratedContent) {
      return (
        <Button
          disabled={isGenerating}
          onClick={handleRegenerateClick}
          size="sm"
          type="button"
          variant="outline"
        >
          {isGenerating ? "Generating..." : "Regenerate"}
        </Button>
      );
    }

    if (isReady) {
      return (
        <Button
          disabled={isGenerating}
          onClick={handleGenerateClick}
          size="sm"
          type="button"
        >
          {isGenerating ? "Generating..." : generateLabel}
        </Button>
      );
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <Button disabled size="sm" type="button" variant="outline">
              {generateLabel}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Missing: {missingLabel}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-[#E5E7EB] bg-white">
      <div
        className={`flex items-center justify-between gap-4 px-4 py-3 ${canExpand ? "cursor-pointer hover:bg-[#F9FAFB]" : ""}`}
        onClick={handleRowClick}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <p className="truncate text-sm font-medium text-[#111827]">
              {displayName}
            </p>
            <Badge variant={isReady ? "default" : "secondary"}>
              {isReady ? "Ready" : "Not ready"}
            </Badge>
          </div>
          {secondaryLabel ? (
            <p className="mt-1 truncate text-xs text-[#374151]">
              {secondaryLabel}
            </p>
          ) : null}
          <p className="mt-1 truncate text-xs text-[#6B7280]">{description}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {renderPrimaryButton()}
          <Button
            disabled={!hasGeneratedContent || isStreaming}
            onClick={handleDownloadClick}
            size="sm"
            type="button"
            variant="outline"
          >
            Download
          </Button>
          {canExpand ? (
            <ChevronDownIcon
              className={`size-4 text-[#6B7280] transition-transform ${isExpanded ? "rotate-180" : ""}`}
            />
          ) : null}
        </div>
      </div>

      {gateContent ? (
        <div className="border-t border-[#E5E7EB] px-4 py-4">{gateContent}</div>
      ) : null}

      {isExpanded ? (
        <div className="border-t border-[#E5E7EB] px-4 py-4">
          <ArtifactPreview
            content={previewContent}
            isPartial={isPartial}
            isStreaming={isStreaming}
          />
        </div>
      ) : null}
    </div>
  );
}
