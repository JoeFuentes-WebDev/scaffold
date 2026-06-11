"use client";

import JSZip from "jszip";
import { useEffect, useState } from "react";

import { ArtifactCard } from "@/components/artifacts/ArtifactCard";
import { ArtifactPreview } from "@/components/artifacts/ArtifactPreview";
import { Button } from "@/components/ui/button";
import {
  ARTIFACT_DEFINITIONS,
  getArtifactFilename,
} from "@/constants/artifacts";
import type { Artifact, ArtifactType, Domain } from "@/lib/types";

interface DocumentsWorkspaceProps {
  projectId: string;
  domains: Domain[];
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

export function DocumentsWorkspace({
  projectId,
  domains,
}: DocumentsWorkspaceProps) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [generatingType, setGeneratingType] = useState<ArtifactType | null>(
    null
  );
  const [previewType, setPreviewType] = useState<ArtifactType | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  async function loadArtifacts() {
    const params = new URLSearchParams({ project_id: projectId });
    const response = await fetch(`/api/artifacts?${params.toString()}`);
    const data = (await response.json()) as {
      artifacts?: Artifact[];
      error?: string;
    };

    if (!response.ok) {
      setError(data.error ?? "Failed to load artifacts");
      return;
    }

    setArtifacts(data.artifacts ?? []);
  }

  useEffect(() => {
    void loadArtifacts();
  }, [projectId]);

  const generatedArtifacts = artifacts.filter(
    (artifact) =>
      artifact.content &&
      (artifact.status === "generated" || artifact.status === "partial")
  );

  async function handleGenerate(artifactType: ArtifactType) {
    setError(null);
    setGeneratingType(artifactType);
    setPreviewType(artifactType);
    setStreamingContent("");

    try {
      const response = await fetch("/api/artifacts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          artifact_type: artifactType,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(data.error ?? "Failed to generate artifact");
        setPreviewType(null);
        return;
      }

      if (!response.body) {
        setError("Failed to generate artifact");
        setPreviewType(null);
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
      setPreviewType(null);
    } finally {
      setGeneratingType(null);
    }
  }

  function handleClosePreview() {
    setPreviewType(null);
    setStreamingContent("");
  }

  function handleDownload(artifactType: ArtifactType) {
    const artifact = getArtifactForType(artifacts, artifactType);
    const content =
      previewType === artifactType && streamingContent
        ? streamingContent
        : artifact?.content;

    if (!content) {
      return;
    }

    const sequenceNumber = artifact?.sequence_number ?? 1;
    const filename = getArtifactFilename(artifactType, sequenceNumber);
    downloadMarkdownFile(filename, content);
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

  function renderPreview(artifactType: ArtifactType) {
    if (previewType !== artifactType) {
      return null;
    }

    const artifact = getArtifactForType(artifacts, artifactType);
    const content =
      streamingContent || artifact?.content || "";
    const sequenceNumber = artifact?.sequence_number ?? 1;
    const isStreaming = generatingType === artifactType;

    return (
      <ArtifactPreview
        artifactType={artifactType}
        content={content}
        isPartial={artifact?.status === "partial"}
        isRegenerating={generatingType === artifactType}
        isStreaming={isStreaming}
        onClose={handleClosePreview}
        onDownload={() => handleDownload(artifactType)}
        onRegenerate={() => handleGenerate(artifactType)}
        sequenceNumber={sequenceNumber}
      />
    );
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

      <div className="grid gap-4 md:grid-cols-2">
        {ARTIFACT_DEFINITIONS.map((definition) => (
          <div key={definition.type}>
            <ArtifactCard
              artifact={getArtifactForType(artifacts, definition.type)}
              definition={definition}
              domains={domains}
              isGenerating={generatingType === definition.type}
              onGenerate={() => handleGenerate(definition.type)}
            />
            {renderPreview(definition.type)}
          </div>
        ))}
      </div>
    </div>
  );
}
