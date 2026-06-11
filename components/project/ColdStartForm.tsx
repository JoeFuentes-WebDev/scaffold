"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { COLD_START_SEED_QUESTIONS } from "@/constants/coldStart";
import type { ColdStartSeedAnswers } from "@/lib/types";

type ProjectType = "new" | "existing";

interface ColdStartFormProps {
  heading?: string;
  onCancel?: () => void;
}

const EMPTY_SEED_ANSWERS: ColdStartSeedAnswers = {
  what_it_does: "",
  who_it_is_for: "",
  v1_boundary: "",
};

function isColdStartComplete(
  name: string,
  seedAnswers: ColdStartSeedAnswers
): boolean {
  if (!name.trim()) {
    return false;
  }

  return COLD_START_SEED_QUESTIONS.every((question) =>
    Boolean(seedAnswers[question.key].trim())
  );
}

export function ColdStartForm({
  heading = "Create your first project",
  onCancel,
}: ColdStartFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [seedAnswers, setSeedAnswers] =
    useState<ColdStartSeedAnswers>(EMPTY_SEED_ANSWERS);
  const [projectType, setProjectType] = useState<ProjectType>("new");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = isColdStartComplete(name, seedAnswers);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          seed_answers: {
            what_it_does: seedAnswers.what_it_does.trim(),
            who_it_is_for: seedAnswers.who_it_is_for.trim(),
            v1_boundary: seedAnswers.v1_boundary.trim(),
          },
          project_type: projectType,
        }),
      });

      const data = (await response.json()) as {
        project_id?: string;
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "Failed to create project");
        return;
      }

      if (data.project_id) {
        router.push(`/projects/${data.project_id}`);
      }
    } catch {
      setError("Failed to create project");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleNameChange(event: React.ChangeEvent<HTMLInputElement>) {
    setName(event.target.value);
  }

  function handleDescriptionChange(
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) {
    setDescription(event.target.value);
  }

  function handleSeedAnswerChange(key: keyof ColdStartSeedAnswers) {
    return (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setSeedAnswers((current) => ({
        ...current,
        [key]: event.target.value,
      }));
    };
  }

  function handleSelectNew() {
    setProjectType("new");
  }

  return (
    <form
      className="mx-auto flex w-full max-w-lg flex-col gap-6"
      onSubmit={handleSubmit}
    >
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-[#111827]">{heading}</h1>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="project-name">Project name</Label>
        <Input
          id="project-name"
          onChange={handleNameChange}
          placeholder="My project"
          value={name}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Project type</Label>
        <div className="flex gap-2">
          <Button
            onClick={handleSelectNew}
            type="button"
            variant={projectType === "new" ? "default" : "outline"}
          >
            New Project
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Button disabled type="button" variant="outline">
                  Existing Project
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Coming in V2</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="project-description">Description (optional)</Label>
        <Textarea
          id="project-description"
          onChange={handleDescriptionChange}
          placeholder="Any extra context, constraints, or background"
          rows={3}
          value={description}
        />
        <p className="text-sm text-[#6B7280]">
          The more specific you are, the sharper the first questions will be.
          Include what the app does, who it&apos;s for, and any key technical
          decisions you&apos;ve already made.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {COLD_START_SEED_QUESTIONS.map((question) => (
          <div className="flex flex-col gap-2" key={question.key}>
            <Label htmlFor={`seed-${question.key}`}>{question.label}</Label>
            <Textarea
              id={`seed-${question.key}`}
              onChange={handleSeedAnswerChange(question.key)}
              rows={3}
              value={seedAnswers[question.key]}
            />
          </div>
        ))}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button
            disabled={isSubmitting}
            onClick={onCancel}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
        ) : null}
        <Button disabled={!canSubmit || isSubmitting} type="submit">
          {isSubmitting ? "Creating..." : "Create Project"}
        </Button>
      </div>
    </form>
  );
}
