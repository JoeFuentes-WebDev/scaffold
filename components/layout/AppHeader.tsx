"use client";

import type { ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProjectDescriptionEditor } from "@/components/project/ProjectDescriptionEditor";

interface AppHeaderProps {
  projectName?: string;
  projectId?: string;
  projectDescription?: string;
  userEmail?: string;
  userAvatarUrl?: string;
  onDescriptionUpdated?: () => void;
  headerAction?: ReactNode;
}

function getInitials(email: string | undefined): string {
  if (!email) {
    return "U";
  }

  return email.charAt(0).toUpperCase();
}

export function AppHeader({
  projectName,
  projectId,
  projectDescription,
  userEmail,
  userAvatarUrl,
  onDescriptionUpdated,
  headerAction,
}: AppHeaderProps) {
  const showDescriptionEditor =
    projectId && projectDescription !== undefined && onDescriptionUpdated;

  return (
    <header className="flex h-auto min-h-14 items-center justify-between border-b border-[#E5E7EB] bg-white px-6 py-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex items-center gap-2 text-sm text-[#6B7280]">
          <span className="font-semibold text-[#111827]">Scaffold</span>
          {projectName ? (
            <>
              <span>•</span>
              <span className="text-[#111827]">{projectName}</span>
            </>
          ) : null}
        </div>
        {showDescriptionEditor ? (
          <ProjectDescriptionEditor
            description={projectDescription}
            onUpdated={onDescriptionUpdated}
            projectId={projectId}
          />
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {headerAction}
        <Avatar className="size-8 shrink-0">
        {userAvatarUrl ? (
          <AvatarImage alt="User avatar" src={userAvatarUrl} />
        ) : null}
        <AvatarFallback>{getInitials(userEmail)}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
