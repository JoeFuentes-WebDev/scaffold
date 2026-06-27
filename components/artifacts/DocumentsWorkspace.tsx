"use client";

import JSZip from "jszip";
import { useEffect, useState } from "react";

import { ArtifactRow } from "@/components/artifacts/ArtifactRow";
import {
  ReviewGate,
  type ReviewGateResult,
} from "@/components/artifacts/ReviewGate";
import { Button } from "@/components/ui/button";
import {
  ARTIFACT_DEFINITIONS,
  getArtifactFilename,
} from "@/constants/artifacts";
import type {
  Artifact,
  ArtifactsWorkspaceUi,
  ArtifactType,
} from "@/lib/types";

interface DocumentsWorkspaceProps {
  projectId: string;
  refreshKey: string;
}

interface GenerateOptions {
  regenerate?: boolean;
  nextMilestone?: boolean;
  reviewContext?: ReviewGateResult;
}

function buildDefaultArtifactThresholds(): ArtifactsWorkspaceUi["artifactThresholds"] {
  return {
    onboarding: { isReady: false, missingLabel: "" },
    milestone: { isReady: false, missingLabel: "" },
    review: { isReady: false, missingLabel: "" },
    env_manifest: { isReady: false, missingLabel: "" },
  };
}

function buildDefaultWorkspaceUi(): ArtifactsWorkspaceUi {
  return {
    canGenerateNextMilestone: false,
    canStartReviewGate: false,
    milestoneSequenceNumber: 1,
    nextMilestoneDisplayName: getArtifactFilename("milestone", 2),
    rowNaming: {
      onboarding: {
        displayName: getArtifactFilename("onboarding", 1),
        filename: getArtifactFilename("onboarding", 1),
      },
      milestone: {
        displayName: getArtifactFilename("milestone", 1),
        filename: getArtifactFilename("milestone", 1),
      },
      review: {
        displayName: getArtifactFilename("review", 1),
        filename: getArtifactFilename("review", 1),
      },
      env_manifest: {
        displayName: getArtifactFilename("env_manifest", 1),
        filename: getArtifactFilename("env_manifest", 1),
      },
    },
    artifactThresholds: buildDefaultArtifactThresholds(),
  };
}

function downloadMarkdownFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function getArtifactForType(
  artifacts: Artifact[],
  artifactType: ArtifactType
): Artifact | null {
  return artifacts.find((item) => item.artifact_type === artifactType) ?? null;
}

function hasGeneratedContent(artifact: Artifact | null): boolean {
  if (!artifact?.content) {
    return false;
  }

  if (artifact.artifact_type === "review") {
    return (
      artifact.status === "template_generated" ||
      artifact.status === "uploaded" ||
      artifact.status === "processed" ||
      artifact.status === "partial"
    );
  }

  return artifact.status === "generated" || artifact.status === "partial";
}

export function DocumentsWorkspace({
  projectId,
  refreshKey,
}: DocumentsWorkspaceProps) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [workspaceUi, setWorkspaceUi] = useState<ArtifactsWorkspaceUi>(
    buildDefaultWorkspaceUi
  );
  const [expandedType, setExpandedType] = useState<ArtifactType | null>(null);
  const [generatingType, setGeneratingType] = useState<ArtifactType | null>(
    null
  );
  const [streamingContent, setStreamingContent] = useState("");
  const [showReviewGate, setShowReviewGate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  async function loadArtifacts() {
    const params = new URLSearchParams({ project_id: projectId });
    const response = await fetch(`/api/artifacts?${params.toString()}`);
    const data = (await response.json()) as {
      artifacts?: Artifact[];
      workspace?: ArtifactsWorkspaceUi;
      error?: string;
    };

    if (!response.ok) {
      setError(data.error ?? "Failed to load artifacts");
      return;
    }

    setArtifacts(data.artifacts ?? []);
    setWorkspaceUi(data.workspace ?? buildDefaultWorkspaceUi());
  }

  function refreshArtifacts() {
    void loadArtifacts();
  }

  useEffect(refreshArtifacts, [projectId, refreshKey]);

  function isGeneratedArtifact(artifact: Artifact): boolean {
    return hasGeneratedContent(artifact);
  }

  const generatedArtifacts = artifacts.filter(isGeneratedArtifact);

  function getRowNaming(artifactType: ArtifactType) {
    return workspaceUi.rowNaming[artifactType];
  }

  function getPreviewContent(artifactType: ArtifactType): string {
    if (generatingType === artifactType) {
      return streamingContent;
    }

    const artifact = getArtifactForType(artifacts, artifactType);
    return artifact?.content ?? "";
  }

  function handleToggleExpand(artifactType: ArtifactType) {
    if (expandedType === artifactType) {
      setExpandedType(null);
      return;
    }

    setExpandedType(artifactType);
  }

  async function handleGenerate(
    artifactType: ArtifactType,
    options?: GenerateOptions
  ) {
    setError(null);
    setGeneratingType(artifactType);
    setExpandedType(artifactType);
    setStreamingContent("");
    setShowReviewGate(false);

    const body: Record<string, unknown> = {
      project_id: projectId,
      artifact_type: artifactType,
    };

    if (options?.regenerate) {
      body.regenerate = true;
    }

    if (options?.nextMilestone) {
      body.next_milestone = true;
    }

    if (options?.reviewContext?.skippedReview) {
      body.skipped_review = true;
    }

    if (options?.reviewContext && !options.reviewContext.skippedReview) {
      body.review_context = {
        completed_review: options.reviewContext.completedReview,
        open_question_answers: options.reviewContext.openQuestionAnswers,
      };
    }

    try {
      const response = await fetch("/api/artifacts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(data.error ?? "Failed to generate artifact");
        return;
      }

      if (!response.body) {
        setError("Failed to generate artifact");
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let content = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        content += chunk;
        setStreamingContent(content);
      }

      await loadArtifacts();
    } catch {
      setError("Failed to generate artifact");
    } finally {
      setGeneratingType(null);
    }
  }

  function handleDownload(artifactType: ArtifactType) {
    const artifact = getArtifactForType(artifacts, artifactType);
    const naming = getRowNaming(artifactType);
    const content = getPreviewContent(artifactType);

    if (!content) {
      return;
    }

    downloadMarkdownFile(naming.filename, content);
  }

  async function handleDownloadAll() {
    setIsDownloadingAll(true);
    setError(null);

    try {
      const zip = new JSZip();

      for (const artifact of generatedArtifacts) {
        if (!artifact.content) {
          continue;
        }

        const filename = getArtifactFilename(
          artifact.artifact_type,
          artifact.sequence_number
        );
        zip.file(filename, artifact.content);
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "scaffold-artifacts.zip";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to download artifacts");
    } finally {
      setIsDownloadingAll(false);
    }
  }

  function handleStartReviewGate() {
    setShowReviewGate(true);
    setExpandedType("milestone");
  }

  function handleCancelReviewGate() {
    setShowReviewGate(false);
  }

  async function handleReviewGateComplete(result: ReviewGateResult) {
    if (!result.skippedReview) {
      const response = await fetch("/api/review/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(data.error ?? "Failed to complete review gate");
        return;
      }
    }

    void handleGenerate("milestone", {
      nextMilestone: true,
      reviewContext: result,
    });
  }

  function renderReviewGate() {
    if (!showReviewGate) {
      return null;
    }

    return (
      <ReviewGate
        nextMilestoneLabel={workspaceUi.nextMilestoneDisplayName}
        onCancel={handleCancelReviewGate}
        onComplete={handleReviewGateComplete}
        projectId={projectId}
        reviewSequenceNumber={workspaceUi.milestoneSequenceNumber}
      />
    );
  }

  function renderNextMilestoneButton() {
    if (!workspaceUi.canStartReviewGate) {
      return null;
    }

    if (!workspaceUi.artifactThresholds.milestone.isReady) {
      return null;
    }

    return (
      <Button
        disabled={generatingType === "milestone" || showReviewGate}
        onClick={handleStartReviewGate}
        size="sm"
        type="button"
        variant="secondary"
      >
        Generate {workspaceUi.nextMilestoneDisplayName}
      </Button>
    );
  }

  function renderArtifactRow(definition: (typeof ARTIFACT_DEFINITIONS)[number]) {
    const artifactType = definition.type;
    const artifact = getArtifactForType(artifacts, artifactType);
    const naming = getRowNaming(artifactType);
    const threshold = workspaceUi.artifactThresholds[artifactType];
    const generated = hasGeneratedContent(artifact);
    const generateLabel =
      artifactType === "milestone" && !generated
        ? `Generate ${naming.displayName}`
        : "Generate";

    function handleRowDownload() {
      handleDownload(artifactType);
    }

    function handleRowToggleExpand() {
      handleToggleExpand(artifactType);
    }

    function handleRowGenerate() {
      void handleGenerate(artifactType);
    }

    function handleRowRegenerate() {
      void handleGenerate(artifactType, { regenerate: true });
    }

    return (
      <div className="space-y-2" key={artifactType}>
        <ArtifactRow
          description={definition.description}
          displayName={naming.displayName}
          gateContent={
            artifactType === "milestone" ? renderReviewGate() : undefined
          }
          generateLabel={generateLabel}
          hasGeneratedContent={generated}
          isExpanded={expandedType === artifactType}
          isGenerating={generatingType === artifactType}
          isPartial={artifact?.status === "partial"}
          isReady={threshold.isReady}
          isStreaming={generatingType === artifactType}
          missingLabel={threshold.missingLabel}
          onDownload={handleRowDownload}
          onGenerate={handleRowGenerate}
          onRegenerate={handleRowRegenerate}
          onToggleExpand={handleRowToggleExpand}
          previewContent={getPreviewContent(artifactType)}
        />
        {artifactType === "milestone" ? (
          <div className="flex justify-end">{renderNextMilestoneButton()}</div>
        ) : null}
      </div>
    );
  }

  function renderDefinitionRow(definition: (typeof ARTIFACT_DEFINITIONS)[number]) {
    return renderArtifactRow(definition);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-[#6B7280]">
          Generate project artifacts when required domains are complete.
        </p>
        <Button
          disabled={generatedArtifacts.length === 0 || isDownloadingAll}
          onClick={handleDownloadAll}
          type="button"
          variant="outline"
        >
          {isDownloadingAll ? "Downloading..." : "Download All"}
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-col gap-4">
        {ARTIFACT_DEFINITIONS.map(renderDefinitionRow)}
      </div>
    </div>
  );
}
