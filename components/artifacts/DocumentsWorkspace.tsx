"use client";

import JSZip from "jszip";
import { useEffect, useState } from "react";

import { ArtifactRow } from "@/components/artifacts/ArtifactRow";
import {
  ReviewGate,
  type ReviewGateResult,
} from "@/components/artifacts/ReviewGate";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ARTIFACT_DEFINITIONS,
  getArtifactFilename,
} from "@/constants/artifacts";
import type {
  Artifact,
  ArtifactsWorkspaceUi,
  ArtifactType,
  ParsedReview,
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

function isReviewExpandable(artifact: Artifact | null): boolean {
  if (!artifact?.content) {
    return false;
  }

  return artifact.status === "uploaded" || artifact.status === "processed";
}

function getReviewTemplateLabel(
  artifact: Artifact | null,
  milestoneDisplayName: string
): string | undefined {
  if (!artifact || artifact.status !== "template_generated") {
    return undefined;
  }

  return `Template — give to Cursor to complete after ${milestoneDisplayName}`;
}

function getMilestoneProgressionLabel(sequenceNumber: number): string {
  return `MILESTONE_${String(sequenceNumber).padStart(2, "0")}`;
}

type MilestoneProgressionStep = "idle" | "upload" | "generate" | "gate";

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
  const [progressionStep, setProgressionStep] =
    useState<MilestoneProgressionStep>("idle");
  const [progressionSkippedReview, setProgressionSkippedReview] =
    useState(false);
  const [progressionParsedReview, setProgressionParsedReview] =
    useState<ParsedReview | null>(null);
  const [progressionParseError, setProgressionParseError] = useState<
    string | null
  >(null);
  const [isParsingProgressionReview, setIsParsingProgressionReview] =
    useState(false);
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

  function resetProgressionState() {
    setProgressionStep("idle");
    setProgressionSkippedReview(false);
    setProgressionParsedReview(null);
    setProgressionParseError(null);
  }

  function syncProgressionWithWorkspace() {
    if (!workspaceUi.canStartReviewGate) {
      resetProgressionState();
      return;
    }

    if (progressionStep === "gate" || generatingType === "milestone") {
      return;
    }

    setProgressionStep(function resolveProgressionStep(previous) {
      if (previous === "upload" || previous === "generate") {
        return previous;
      }

      return "idle";
    });
  }

  useEffect(syncProgressionWithWorkspace, [
    workspaceUi.canStartReviewGate,
    generatingType,
    progressionStep,
  ]);

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

    if (artifactType === "milestone" && options?.nextMilestone) {
      setProgressionStep("gate");
    }

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

      resetProgressionState();
      await loadArtifacts();
    } catch {
      setError("Failed to generate artifact");
    } finally {
      setGeneratingType(null);
    }
  }

  function handleDownload(artifactType: ArtifactType) {
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

  function handleContinueToNextMilestone() {
    setProgressionStep("upload");
    setProgressionSkippedReview(false);
    setProgressionParsedReview(null);
    setProgressionParseError(null);
    setExpandedType("milestone");
  }

  async function parseProgressionReview(content: string) {
    setProgressionParseError(null);
    setIsParsingProgressionReview(true);

    try {
      const response = await fetch("/api/review/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          content,
        }),
      });

      const data = (await response.json()) as ParsedReview & { error?: string };

      if (!response.ok) {
        setProgressionParseError(data.error ?? "Failed to parse review file");
        return;
      }

      setProgressionParsedReview(data);
      setProgressionSkippedReview(false);
      setProgressionStep("generate");
      await loadArtifacts();
    } catch {
      setProgressionParseError("Failed to parse review file");
    } finally {
      setIsParsingProgressionReview(false);
    }
  }

  function handleProgressionFileUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file || !file.name.endsWith(".md")) {
      return;
    }

    const reader = new FileReader();

    reader.onload = function handleProgressionReaderLoad(
      loadEvent: ProgressEvent<FileReader>
    ) {
      const content = String(loadEvent.target?.result ?? "");
      void parseProgressionReview(content);
    };

    reader.readAsText(file);
  }

  function handleSkipProgressionUpload() {
    setProgressionSkippedReview(true);
    setProgressionParsedReview(null);
    setProgressionStep("generate");
  }

  function handleStartReviewGateFromProgression() {
    if (progressionSkippedReview) {
      void handleReviewGateComplete({
        completedReview: "",
        openQuestionAnswers: [],
        skippedReview: true,
      });
      return;
    }

    const hasOpenQuestions =
      (progressionParsedReview?.openQuestions.length ?? 0) > 0;
    const hasManualSteps =
      (progressionParsedReview?.manualSteps.length ?? 0) > 0;

    if (!hasOpenQuestions && !hasManualSteps) {
      void handleReviewGateComplete({
        completedReview: progressionParsedReview?.rawContent ?? "",
        openQuestionAnswers: [],
        skippedReview: false,
      });
      return;
    }

    setProgressionStep("gate");
    setExpandedType("milestone");
  }

  function handleCancelReviewGate() {
    setProgressionStep("generate");
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
    if (progressionStep !== "gate") {
      return null;
    }

    return (
      <ReviewGate
        hideUploadStep
        initialParsedReview={progressionParsedReview}
        initialSkippedReview={progressionSkippedReview}
        nextMilestoneLabel={getNextMilestoneProgressionLabel()}
        onCancel={handleCancelReviewGate}
        onComplete={handleReviewGateComplete}
        projectId={projectId}
        reviewSequenceNumber={workspaceUi.milestoneSequenceNumber}
      />
    );
  }

  function getNextMilestoneProgressionLabel(): string {
    return getMilestoneProgressionLabel(
      workspaceUi.milestoneSequenceNumber + 1
    );
  }

  function renderProgressionUploadSection() {
    if (progressionStep !== "upload") {
      return null;
    }

    const reviewFilename = getArtifactFilename(
      "review",
      workspaceUi.milestoneSequenceNumber
    );

    return (
      <div className="space-y-3 rounded-md border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-4">
        <p className="text-sm font-medium text-[#111827]">
          Upload completed {reviewFilename}
        </p>
        <div>
          <Label htmlFor="progression-review-upload">Choose File</Label>
          <input
            accept=".md,text/markdown"
            className="mt-2 block w-full text-sm text-[#6B7280]"
            disabled={isParsingProgressionReview}
            id="progression-review-upload"
            onChange={handleProgressionFileUpload}
            type="file"
          />
        </div>
        {progressionParseError ? (
          <p className="text-sm text-destructive">{progressionParseError}</p>
        ) : null}
        <Button
          disabled={isParsingProgressionReview}
          onClick={handleSkipProgressionUpload}
          type="button"
          variant="outline"
        >
          Skip (generate without review)
        </Button>
      </div>
    );
  }

  function renderContinueButton() {
    if (!workspaceUi.canStartReviewGate || progressionStep !== "idle") {
      return null;
    }

    return (
      <Button
        disabled={generatingType === "milestone"}
        onClick={handleContinueToNextMilestone}
        size="sm"
        type="button"
        variant="secondary"
      >
        Continue to {getNextMilestoneProgressionLabel()}
      </Button>
    );
  }

  function renderGenerateNextMilestoneButton() {
    if (progressionStep !== "generate") {
      return null;
    }

    return (
      <div className="space-y-2">
        {progressionSkippedReview ? (
          <p className="text-sm text-amber-600">
            Generating without a completed review. Open questions may be missed.
          </p>
        ) : null}
        <Button
          disabled={generatingType === "milestone"}
          onClick={handleStartReviewGateFromProgression}
          size="sm"
          type="button"
        >
          Generate {getNextMilestoneProgressionLabel()}
        </Button>
      </div>
    );
  }

  function renderMilestoneProgression() {
    if (!workspaceUi.canStartReviewGate) {
      return null;
    }

    return (
      <div className="space-y-3">
        {renderContinueButton()}
        {renderProgressionUploadSection()}
        {renderGenerateNextMilestoneButton()}
      </div>
    );
  }

  function renderArtifactRow(definition: (typeof ARTIFACT_DEFINITIONS)[number]) {
    const artifactType = definition.type;
    const artifact = getArtifactForType(artifacts, artifactType);
    const naming = getRowNaming(artifactType);
    const threshold = workspaceUi.artifactThresholds[artifactType];
    const generated = hasGeneratedContent(artifact);
    const milestoneNaming = getRowNaming("milestone");
    const isReview = artifactType === "review";
    const generateLabel =
      artifactType === "milestone" && !generated
        ? `Generate ${naming.displayName}`
        : "Generate";
    const secondaryLabel = isReview
      ? getReviewTemplateLabel(artifact, milestoneNaming.displayName)
      : undefined;
    const isExpandable = isReview
      ? isReviewExpandable(artifact)
      : generated || generatingType === artifactType;
    const showGenerateButton = !isReview;

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
          isExpandable={isExpandable}
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
          secondaryLabel={secondaryLabel}
          showGenerateButton={showGenerateButton}
        />
        {artifactType === "milestone" ? renderMilestoneProgression() : null}
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
