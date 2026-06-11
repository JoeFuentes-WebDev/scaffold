import { cva } from "class-variance-authority";

import type { DomainName, DomainStatus } from "@/lib/types";

export type { DomainStatus };

export const DOMAIN_STATUS_LABELS: Record<DomainStatus, string> = {
  locked: "Locked",
  available: "Available",
  in_progress: "In Progress",
  complete: "Complete",
};

export const domainTabItem = cva(
  "flex items-center justify-between w-full px-3 py-2 rounded-md text-sm transition-colors",
  {
    variants: {
      status: {
        locked:
          "text-gray-300 cursor-not-allowed pointer-events-none",
        available: "text-blue-600 cursor-pointer hover:bg-blue-50",
        in_progress: "text-amber-500 cursor-pointer hover:bg-amber-50",
        complete: "text-green-600 cursor-pointer hover:bg-green-50",
      },
    },
    defaultVariants: {
      status: "locked",
    },
  }
);

export interface DomainDefinition {
  name: DomainName;
  label: string;
}

export const DOMAIN_DEFINITIONS: DomainDefinition[] = [
  { name: "product", label: "Product" },
  { name: "scope", label: "Scope" },
  { name: "users", label: "Users" },
  { name: "architecture", label: "Architecture" },
  { name: "tech_stack", label: "Tech Stack" },
  { name: "domain_model", label: "Domain Model" },
  { name: "engineering_rules", label: "Engineering Rules" },
  { name: "deployment", label: "Deployment" },
];

export const INITIAL_DOMAIN_STATUSES: Record<DomainName, DomainStatus> = {
  product: "available",
  scope: "locked",
  users: "locked",
  architecture: "locked",
  tech_stack: "locked",
  domain_model: "locked",
  engineering_rules: "locked",
  deployment: "locked",
};
