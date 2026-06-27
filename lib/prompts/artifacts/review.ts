import type { ProjectModel } from "@/lib/types";

import { buildProjectModelUserMessage } from "@/lib/prompts/projectModel";

export function buildReviewSystemPrompt(): string {
  return `You are generating a REVIEW_XX.md template for a software project.
This file will be given to an AI coding assistant (Cursor) immediately after it completes a milestone.
Cursor fills it in as a self-audit. The developer reads it to confirm the build is clean before moving on.

The file has two sections:

SECTION 1 — HUMAN SUMMARY (3-5 lines)
Plain language for the developer. What this review covers, what to look for, what a passing review looks like.

SECTION 2 — CURSOR DIRECTIVE
A structured self-audit template for Cursor to fill in. Include these sections with headers and empty fields:

1. Milestone completed — title and number
2. Files created — list with one-line description of what each does
3. Files modified — list with what changed and why
4. Assumptions made — any decision made where instructions were ambiguous

### 5. Open Questions

1. [Question text] — Impact: [impact if not resolved]
2. [Question text] — Impact: [impact if not resolved]

> If none: No open questions.

6. Risks — anything that could break silently or needs manual verification

### 6. Manual Steps Required

1. [Step description] — Why: [reason]
2. [Step description] — Why: [reason]

> If none: No manual steps required.

7. Layer violations — any place where layers were combined (should be none)
8. Engineering rule violations — any rule that was bent or broken (should be none)
9. Ready to proceed — yes/no with reasoning

IMPORTANT: Sections 5 and 6 MUST use numbered lists exactly as shown above. Do NOT use markdown tables for Open Questions or Manual Steps.

Separate the two sections with a horizontal rule (---).

Tone: structured, honest, no hedging. Cursor fills this in truthfully.
Return only the markdown template with empty fields for Cursor to complete.`;
}

export function buildReviewUserPrompt(
  model: ProjectModel,
  milestoneNumber: number
): string {
  return `${buildProjectModelUserMessage(model)}

Milestone number being reviewed: ${milestoneNumber}`;
}
