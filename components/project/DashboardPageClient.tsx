"use client";

import { useState } from "react";

import { AppHeader } from "@/components/layout/AppHeader";
import {
  DashboardNewProjectButton,
  DashboardProjectsView,
} from "@/components/project/DashboardProjectsView";
import type { Project } from "@/lib/types";

interface DashboardPageClientProps {
  projects: Project[];
  userEmail?: string;
  userAvatarUrl?: string;
}

export function DashboardPageClient({
  projects,
  userEmail,
  userAvatarUrl,
}: DashboardPageClientProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);

  function handleShowCreateForm() {
    setShowCreateForm(true);
  }

  function handleHideCreateForm() {
    setShowCreateForm(false);
  }

  return (
    <div className="flex min-h-full flex-col bg-[#F8F9FA]">
      <AppHeader
        headerAction={
          projects.length > 0 ? (
            <DashboardNewProjectButton
              onShowCreateForm={handleShowCreateForm}
              showCreateForm={showCreateForm}
            />
          ) : null
        }
        userAvatarUrl={userAvatarUrl}
        userEmail={userEmail}
      />
      <DashboardProjectsView
        onHideCreateForm={handleHideCreateForm}
        projects={projects}
        showCreateForm={showCreateForm}
      />
    </div>
  );
}
