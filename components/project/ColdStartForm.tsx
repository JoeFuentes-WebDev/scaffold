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

type ProjectType = "new" | "existing";

export function ColdStartForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectType, setProjectType] = useState<ProjectType>("new");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
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

  function handleSelectNew() {
    setProjectType("new");
  }

  return (
    <form
      className="mx-auto flex w-full max-w-lg flex-col gap-6"
      onSubmit={handleSubmit}
    >
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-[#111827]">
          Create your first project
        </h1>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="project-name">Project name</Label>
        <Input
          id="project-name"
          onChange={handleNameChange}
          placeholder="My project"
          required
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
        <Label htmlFor="project-description">Description</Label>
        <Textarea
          id="project-description"
          onChange={handleDescriptionChange}
          placeholder="Describe the project. What does it do, who is it for, and what problem does it solve?"
          required
          rows={4}
          value={description}
        />
        <p className="text-sm text-[#6B7280]">
          The more specific you are, the sharper the first questions will be.
          Include what the app does, who it&apos;s for, and any key technical
          decisions you&apos;ve already made.
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? "Creating..." : "Create Project"}
      </Button>
    </form>
  );
}
