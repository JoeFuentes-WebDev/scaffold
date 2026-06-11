"use client";

import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { getArtifactFilename } from "@/constants/artifacts";
import type { ArtifactType } from "@/lib/types";

import "highlight.js/styles/github.min.css";

interface ArtifactPreviewProps {
  artifactType: ArtifactType;
  sequenceNumber: number;
  content: string;
  isStreaming: boolean;
  isPartial: boolean;
  onDownload: () => void;
  onClose: () => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

export function ArtifactPreview({
  artifactType,
  sequenceNumber,
  content,
  isStreaming,
  isPartial,
  onDownload,
  onClose,
  onRegenerate,
  isRegenerating,
}: ArtifactPreviewProps) {
  const filename = getArtifactFilename(artifactType, sequenceNumber);

  return (
    <div className="mt-4 space-y-4 rounded-md border border-[#E5E7EB] bg-[#F9FAFB] p-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-[#111827]">{filename}</p>
        <div className="flex gap-2">
          <Button
            disabled={!content.trim() || isStreaming}
            onClick={onDownload}
            size="sm"
            type="button"
            variant="outline"
          >
            Download
          </Button>
          <Button onClick={onClose} size="sm" type="button" variant="ghost">
            Close
          </Button>
        </div>
      </div>

      {isPartial ? (
        <p className="text-sm text-amber-600">
          Generation was interrupted. Partial content was saved — regenerate to
          get a complete artifact.
        </p>
      ) : null}

      {isStreaming ? (
        <p className="text-xs text-[#6B7280]">Generating...</p>
      ) : null}

      <div className="prose prose-sm max-w-none rounded-md border border-[#E5E7EB] bg-white p-4">
        <ReactMarkdown
          rehypePlugins={[rehypeHighlight]}
          remarkPlugins={[remarkGfm]}
        >
          {content || "*Waiting for content...*"}
        </ReactMarkdown>
      </div>

      <Button
        disabled={isStreaming || isRegenerating}
        onClick={onRegenerate}
        type="button"
        variant="outline"
      >
        {isRegenerating ? "Regenerating..." : "Regenerate"}
      </Button>
    </div>
  );
}
