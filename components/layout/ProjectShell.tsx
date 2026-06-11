"use client";

import { useState } from "react";

import { AppHeader } from "@/components/layout/AppHeader";
import { DomainSidebar } from "@/components/layout/DomainSidebar";
import { DOMAIN_DEFINITIONS } from "@/constants/domains";
import type { Domain, DomainName } from "@/lib/types";

interface ProjectShellProps {
  projectName: string;
  domains: Domain[];
  userEmail?: string;
  userAvatarUrl?: string;
}

type ActiveTab = DomainName | "documents";

function getTabLabel(activeTab: ActiveTab): string {
  if (activeTab === "documents") {
    return "Documents";
  }

  const domain = DOMAIN_DEFINITIONS.find((item) => item.name === activeTab);
  return domain?.label ?? activeTab;
}

export function ProjectShell({
  projectName,
  domains,
  userEmail,
  userAvatarUrl,
}: ProjectShellProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("product");

  function handleTabSelect(tab: ActiveTab) {
    setActiveTab(tab);
  }

  return (
    <div className="flex min-h-full flex-col bg-[#F8F9FA]">
      <AppHeader
        projectName={projectName}
        userAvatarUrl={userAvatarUrl}
        userEmail={userEmail}
      />
      <div className="flex flex-1">
        <DomainSidebar
          activeTab={activeTab}
          domains={domains}
          onTabSelect={handleTabSelect}
        />
        <main className="flex-1 p-8">
          <div className="rounded-lg border border-[#E5E7EB] bg-white p-6">
            <h2 className="text-xl font-semibold text-[#111827]">
              {getTabLabel(activeTab)}
            </h2>
            <p className="mt-2 text-sm text-[#6B7280]">
              Domain content will be built in Milestone 2.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
