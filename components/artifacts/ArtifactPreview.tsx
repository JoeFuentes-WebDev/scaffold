"use client";

import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

import "highlight.js/styles/github.min.css";

interface ArtifactPreviewProps {
  content: string;
  isStreaming: boolean;
  isPartial: boolean;
}

export function ArtifactPreview({
  content,
  isStreaming,
  isPartial,
}: ArtifactPreviewProps) {
  return (
    <div className="space-y-3">
      {isPartial ? (
        <p className="text-sm text-amber-600">
          Generation was interrupted. Partial content was saved — regenerate to
          get a complete artifact.
        </p>
      ) : null}

      {isStreaming ? (
        <p className="text-xs text-[#6B7280]">Generating...</p>
      ) : null}

      <div className="prose prose-sm max-w-none rounded-md border border-[#E5E7EB] bg-[#F9FAFB] p-4">
        <ReactMarkdown
          rehypePlugins={[rehypeHighlight]}
          remarkPlugins={[remarkGfm]}
        >
          {content || "*Waiting for content...*"}
        </ReactMarkdown>
      </div>
    </div>
  );
}
