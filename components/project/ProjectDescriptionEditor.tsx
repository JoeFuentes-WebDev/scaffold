"use client";

import { PencilIcon } from "lucide-react";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { DomainName } from "@/lib/types";

interface ProjectDescriptionEditorProps {
  projectId: string;
  description: string;
  onUpdated: () => void;
}

export function ProjectDescriptionEditor({
  projectId,
  description,
  onUpdated,
}: ProjectDescriptionEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(description);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRegeneratePrompt, setShowRegeneratePrompt] = useState(false);
  const [pendingDomains, setPendingDomains] = useState<DomainName[]>([]);

  function handleEditClick() {
    setDraft(description);
    setIsEditing(true);
    setError(null);
  }

  function handleCancelEdit() {
    setIsEditing(false);
    setDraft(description);
    setError(null);
  }

  function handleDraftChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setDraft(event.target.value);
  }

  async function saveDescription() {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: draft.trim() }),
      });

      const data = (await response.json()) as {
        pending_domains?: DomainName[];
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "Failed to update description");
        return;
      }

      setIsEditing(false);
      onUpdated();

      if (data.pending_domains && data.pending_domains.length > 0) {
        setPendingDomains(data.pending_domains);
        setShowRegeneratePrompt(true);
      }
    } catch {
      setError("Failed to update description");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRegenerateConfirm() {
    setShowRegeneratePrompt(false);

    await fetch(`/api/projects/${projectId}/regenerate-pending`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain_names: pendingDomains }),
    });

    onUpdated();
  }

  function handleRegenerateDismiss() {
    setShowRegeneratePrompt(false);
    setPendingDomains([]);
  }

  if (isEditing) {
    return (
      <div className="mt-2 space-y-2">
        <Textarea
          onChange={handleDraftChange}
          rows={3}
          value={draft}
        />
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        <div className="flex gap-2">
          <Button disabled={isSaving} onClick={saveDescription} size="sm" type="button">
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button
            disabled={isSaving}
            onClick={handleCancelEdit}
            size="sm"
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mt-1 flex items-start gap-2">
        <p className="max-w-xl text-xs text-[#6B7280] line-clamp-2">
          {description}
        </p>
        <Button
          aria-label="Edit project description"
          onClick={handleEditClick}
          size="icon-xs"
          type="button"
          variant="ghost"
        >
          <PencilIcon className="size-3.5" />
        </Button>
      </div>

      <AlertDialog
        onOpenChange={setShowRegeneratePrompt}
        open={showRegeneratePrompt}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate questions?</AlertDialogTitle>
            <AlertDialogDescription>
              Your description changed. Regenerate questions for active domains?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleRegenerateDismiss}>
              No
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleRegenerateConfirm}>
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
