import type { ProjectModel } from "@/lib/types";

import {
  buildProjectModelUserMessage,
} from "@/lib/prompts/projectModel";

export function buildOnboardingSystemPrompt(): string {
  return `You are generating an ONBOARDING.md file for a software project.
This file will be read by an AI coding assistant (Cursor) at the start of every build session.
Its job is to give Cursor a complete, persistent picture of the project so it never drifts off-script.

The file has two sections:

SECTION 1 — HUMAN SUMMARY (3-5 lines)
Plain language summary for the developer. What this project is, current build phase, when to regenerate this file.

SECTION 2 — CURSOR DIRECTIVE
Written for Cursor. Include all of the following in this order:
1. Project name and one-line description
2. What the project does and who it's for
3. Folder structure with layer responsibilities
4. Tech stack — every technology, why it was chosen
5. Layer rules — what each layer owns, what it must never do
6. Engineering rules — the complete do/don't list for this codebase
7. Current build phase and what is explicitly out of scope
8. Domain model — every entity, its properties, its invariants
9. Must-always and must-never list (5-10 items each, the most critical rules)

Separate the two sections with a horizontal rule (---).

Tone: direct, dense, structured. Written for a machine, not a human.
No filler. No preamble. No "here is your ONBOARDING.md".
Do not instruct Cursor to create or update README.md or any files outside ONBOARDING.md.
Return only the markdown content.`;
}

export function buildOnboardingUserPrompt(model: ProjectModel): string {
  return buildProjectModelUserMessage(model);
}
