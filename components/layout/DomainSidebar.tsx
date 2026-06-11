import {
  DOMAIN_DEFINITIONS,
  DOMAIN_STATUS_LABELS,
  domainTabItem,
} from "@/constants/domains";
import type { Domain, DomainName, DomainStatus } from "@/lib/types";

interface DomainTabItemProps {
  label: string;
  status: DomainStatus;
  isActive: boolean;
  onSelect: (domainName: DomainName | "documents") => void;
  domainName: DomainName | "documents";
}

function handleTabClick(
  onSelect: DomainTabItemProps["onSelect"],
  domainName: DomainName | "documents",
  status: DomainStatus
) {
  if (status === "locked") {
    return;
  }

  onSelect(domainName);
}

export function DomainTabItem({
  label,
  status,
  isActive,
  onSelect,
  domainName,
}: DomainTabItemProps) {
  function onClick() {
    handleTabClick(onSelect, domainName, status);
  }

  return (
    <button
      className={`${domainTabItem({ status })} ${isActive ? "bg-[#EFF6FF] ring-1 ring-[#2563EB]/20" : ""}`}
      onClick={onClick}
      type="button"
    >
      <span>{label}</span>
      <span className="text-xs">{DOMAIN_STATUS_LABELS[status]}</span>
    </button>
  );
}

interface DomainSidebarProps {
  domains: Domain[];
  activeTab: DomainName | "documents";
  documentsStatus: DomainStatus;
  onTabSelect: (tab: DomainName | "documents") => void;
}

function getDomainStatus(
  domains: Domain[],
  domainName: DomainName
): DomainStatus {
  const domain = domains.find((item) => item.name === domainName);
  return domain?.status ?? "locked";
}

export function DomainSidebar({
  domains,
  activeTab,
  documentsStatus,
  onTabSelect,
}: DomainSidebarProps) {
  return (
    <aside className="flex w-60 shrink-0 flex-col gap-1 border-r border-[#E5E7EB] bg-white p-4">
      <nav className="flex flex-col gap-1">
        {DOMAIN_DEFINITIONS.map((domain) => (
          <DomainTabItem
            domainName={domain.name}
            isActive={activeTab === domain.name}
            key={domain.name}
            label={domain.label}
            onSelect={onTabSelect}
            status={getDomainStatus(domains, domain.name)}
          />
        ))}
        <div className="my-2 border-t border-[#E5E7EB]" />
        <DomainTabItem
          domainName="documents"
          isActive={activeTab === "documents"}
          label="Documents"
          onSelect={onTabSelect}
          status={documentsStatus}
        />
      </nav>
    </aside>
  );
}
