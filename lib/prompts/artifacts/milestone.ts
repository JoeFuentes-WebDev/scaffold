import { buildProjectModelUserMessage } from "@/lib/prompts/projectModel";
import type { MilestoneReviewContext, ProjectModel } from "@/lib/types";

export type { MilestoneReviewContext };

export function buildMilestoneSystemPrompt(): string {
  return `You are generating a MILESTONE_XX.md file for a software project.
This file will be given to an AI coding assistant (Cursor) as a single build session directive.
One milestone = one change = one session. Cursor must not go beyond what is specified.

The file has two sections:

SECTION 1 — HUMAN SUMMARY (3-5 lines)
Plain language for the developer. What this milestone builds, why it comes next, estimated session complexity.

SECTION 2 — CURSOR DIRECTIVE
Written for Cursor. Include all of the following:
1. Milestone title and number
2. What this milestone builds — specific, scoped, unambiguous
3. Why this comes next — dependency chain reasoning
4. Files to create — path, purpose, one-line description each
5. Files to modify — path, what changes and why
6. Files to leave untouched — explicit list
7. Layer rules reminder — the three most relevant rules for this milestone
8. Engineering rules — the do/don't list relevant to this milestone's work
9. Ambiguity protocol — stop and record if no safe assumption exists
10. What is NOT in this milestone — explicit out-of-scope list
11. Assumptions Made — empty section for Cursor to fill
12. Open Questions — empty section for Cursor to fill

Separate the two sections with a horizontal rule (---).

Tone: direct, scoped, unambiguous. One change only.
Do not invent scope. Only include what the ProjectModel and current build phase support.
Do not instruct Cursor to create or update README.md or any files outside this milestone.
Return only the markdown content.`;
}

export function buildMilestoneUserPrompt(
  model: ProjectModel,
  milestoneNumber: number,
  reviewContext?: MilestoneReviewContext
): string {
  const reviewSection = reviewContext
    ? `Previous milestone review:
${reviewContext.completedReview}

Open questions resolved:
${reviewContext.openQuestionAnswers
  .map((item) => `Q: ${item.question}\nA: ${item.answer}`)
  .join("\n\n")}

`
    : "";

  return `${reviewSection}${buildProjectModelUserMessage(model)}

Current milestone number: ${milestoneNumber}`;
}

/** @deprecated Use buildMilestoneUserPrompt */
export const buildMilestonePrompt = buildMilestoneUserPrompt;
