"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppHeader } from "@/components/layout/AppHeader";
import { DomainSidebar } from "@/components/layout/DomainSidebar";
import { DomainWorkspace } from "@/components/project/DomainWorkspace";
import { DocumentsWorkspace } from "@/components/artifacts/DocumentsWorkspace";
import { DOMAIN_DEFINITIONS } from "@/constants/domains";
import type { Domain, DomainName, DomainStatus } from "@/lib/types";

interface ProjectShellProps {
  projectId: string;
  projectName: string;
  projectDescription: string;
  domains: Domain[];
  documentsStatus: DomainStatus;
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

function getActiveDomain(
  domains: Domain[],
  activeTab: ActiveTab
): Domain | null {
  if (activeTab === "documents") {
    return null;
  }

  return domains.find((domain) => domain.name === activeTab) ?? null;
}

function renderDocumentsContent(
  documentsStatus: DomainStatus,
  projectId: string
): React.ReactNode {
  if (documentsStatus === "locked") {
    return (
      <p className="text-sm text-[#6B7280]">
        Documents are locked until at least one artifact&apos;s required domains
        are complete.
      </p>
    );
  }

  return <DocumentsWorkspace projectId={projectId} refreshKey={documentsStatus} />;
}

export function ProjectShell({
  projectId,
  projectName,
  projectDescription,
  domains: initialDomains,
  documentsStatus: initialDocumentsStatus,
  userEmail,
  userAvatarUrl,
}: ProjectShellProps) {
  const router = useRouter();
  const [domains, setDomains] = useState(initialDomains);
  const [documentsStatus, setDocumentsStatus] = useState(initialDocumentsStatus);
  const [activeTab, setActiveTab] = useState<ActiveTab>("product");

  function syncInitialProjectState() {
    setDomains(initialDomains);
    setDocumentsStatus(initialDocumentsStatus);
  }

  useEffect(syncInitialProjectState, [initialDomains, initialDocumentsStatus]);

  const activeDomain = getActiveDomain(domains, activeTab);

  function handleTabSelect(tab: ActiveTab) {
    setActiveTab(tab);
  }

  function handleRefresh() {
    router.refresh();
  }

  function renderMainContent() {
    if (activeTab === "documents") {
      return renderDocumentsContent(documentsStatus, projectId);
    }

    if (!activeDomain) {
      return null;
    }

    return (
      <DomainWorkspace
        domain={activeDomain}
        onRefresh={handleRefresh}
        projectId={projectId}
      />
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-[#F8F9FA]">
      <AppHeader
        onDescriptionUpdated={handleRefresh}
        projectDescription={projectDescription}
        projectId={projectId}
        projectName={projectName}
        userAvatarUrl={userAvatarUrl}
        userEmail={userEmail}
      />
      <div className="flex flex-1">
        <DomainSidebar
          activeTab={activeTab}
          documentsStatus={documentsStatus}
          domains={domains}
          onTabSelect={handleTabSelect}
        />
        <main className="flex-1 p-8">
          <div className="rounded-lg border border-[#E5E7EB] bg-white p-6">
            <h2 className="text-xl font-semibold text-[#111827]">
              {getTabLabel(activeTab)}
            </h2>
            <div className="mt-4">{renderMainContent()}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
