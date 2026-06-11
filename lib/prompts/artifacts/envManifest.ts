import type { ProjectModel } from "@/lib/types";

import { buildProjectModelUserMessageForEnvManifest } from "@/lib/prompts/projectModel";

export function buildEnvManifestSystemPrompt(): string {
  return `You are generating an ENV_MANIFEST.md file for a software project.
This file documents everything that must exist before \`npm run dev\` succeeds.
It is read by the developer when setting up the project for the first time, switching machines, or onboarding a new team member.
It is also read by Cursor when generating setup instructions or debugging environment issues.

The file has two sections:

SECTION 1 — HUMAN SUMMARY (3-5 lines)
Plain language. What this file covers, how many services require setup, estimated setup time.

SECTION 2 — CURSOR DIRECTIVE
Written for both developer and Cursor. Include all of the following:

1. Prerequisites — Node version, package manager, required global tools
2. Environment variables — every variable, what it does, where to get it, example format
3. External services — for each service:
   a. Service name and purpose
   b. Account creation URL
   c. Step-by-step setup instructions (specific enough to follow without prior knowledge)
   d. Which environment variables it provides
   e. Verification step — how to confirm it's working
4. Local setup sequence — ordered steps from clone to running dev server
5. Common failure modes — the 3-5 most likely setup failures and how to fix them

Separate the two sections with a horizontal rule (---).

Tone: specific, sequential, no assumed knowledge. If a step requires back-and-forth between two services, call that out explicitly.
Return only the markdown content.`;
}

export function buildEnvManifestUserPrompt(model: ProjectModel): string {
  return buildProjectModelUserMessageForEnvManifest(model);
}
