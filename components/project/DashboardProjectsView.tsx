"use client";

import { useState } from "react";

import { ColdStartForm } from "@/components/project/ColdStartForm";
import { ProjectList } from "@/components/project/ProjectList";
import { Button } from "@/components/ui/button";
import type { Project } from "@/lib/types";

interface DashboardProjectsViewProps {
  projects: Project[];
}

export function DashboardProjectsView({ projects }: DashboardProjectsViewProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);

  function handleShowCreateForm() {
    setShowCreateForm(true);
  }

  function handleHideCreateForm() {
    setShowCreateForm(false);
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <ColdStartForm />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827]">Projects</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Select a project to continue building.
          </p>
        </div>
        {!showCreateForm ? (
          <Button onClick={handleShowCreateForm} type="button">
            New Project
          </Button>
        ) : null}
      </div>

      {showCreateForm ? (
        <div className="mb-8 rounded-lg border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <ColdStartForm
            heading="Create a new project"
            onCancel={handleHideCreateForm}
          />
        </div>
      ) : null}

      <ProjectList projects={projects} />
    </div>
  );
}
