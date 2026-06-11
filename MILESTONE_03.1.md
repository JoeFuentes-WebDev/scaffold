# MILESTONE_03.1 — Documents UX Redesign + Review Gate

## What this milestone builds

- Documents tab layout: full-width rows replacing 2x2 card grid
- Fix XX placeholder in artifact card names
- Review Gate: pre-flight checklist before generating next milestone

## Ambiguity protocol

If you encounter a decision not covered here:
- If a safe assumption exists, make it, record it under ## Assumptions Made, and continue
- If no safe assumption exists, stop and add the question to ## Open Questions — do not guess

---

## UX Fix 1 — Documents Tab Layout Redesign

Replace the 2x2 card grid with full-width rows.

Each row (collapsed default):
```
┌─────────────────────────────────────────────────────────────┐
│  ONBOARDING.md     [Ready]     [Regenerate]  [Download]     │
└─────────────────────────────────────────────────────────────┘
```

On Generate or row click — expands inline below, full width:
```
┌─────────────────────────────────────────────────────────────┐
│  ONBOARDING.md     [Ready]     [Regenerate]  [Download]  ▲  │
├─────────────────────────────────────────────────────────────┤
│  < streaming markdown preview, full width >                  │
└─────────────────────────────────────────────────────────────┘
```

- One expanded at a time — expanding a second row collapses the first
- Chevron icon indicates expanded/collapsed state
- Download button only active when artifact has been generated
- Regenerate replaces Generate after first generation

---

## UX Fix 2 — XX Placeholder in Artifact Names

MILESTONE_XX.md and REVIEW_XX.md display literally in the UI and in generated filenames.

Fix in `artifactService` and `ArtifactCard`:
- Derive display name and download filename from sequence_number
- Format: zero-padded two digits (01, 02, 03...)
- MILESTONE_01.md, REVIEW_01.md on first generation
- Pass computed filename to ArtifactCard as a prop, not derived in the component

---

## Feature — Review Gate

### Where it appears

On the MILESTONE artifact row only. After MILESTONE_01 has been generated, the Generate button for the next milestone shows as "Generate MILESTONE_02" and is gated behind the review flow.

### Gate flow

**Step 1 — Upload Review**
- File upload input: "Upload completed REVIEW_01.md"
- Accepts .md files only
- Parse markdown on upload — extract two sections:
  - Open Questions (look for `## Open Questions` header, extract list items)
  - Manual Steps (look for `## Manual Steps` or similar, extract list items)
- Optional — skip link with warning: "Generating without a completed review. Open questions from the previous milestone will not be factored in."

**Step 2 — Open Questions Round (conditional)**
- If open questions exist in the parsed review: surface them as a mini Q&A round
- Same QuestionRound component as questionnaire — reuse it
- Must answer all questions before proceeding
- If no open questions: skip this step entirely

**Step 3 — Manual Steps Checklist (conditional)**
- If manual steps exist in the parsed review: list them with checkboxes
- User checks each off to confirm done
- All must be checked before proceeding
- If no manual steps: skip this step entirely

**Step 4 — Generate**
- All gate steps passed or skipped
- Generate MILESTONE_02.md button activates
- Include parsed review content + open question answers in the milestone prompt context

### Gate state persistence
Store gate completion state in the artifact row UI state only — no DB changes needed. Gate resets if user navigates away.

### Prompt update
In `/lib/prompts/artifacts/milestone.ts`, add optional review context parameter:
```ts
export function buildMilestonePrompt(
  projectModel: ProjectModel,
  milestoneNumber: number,
  reviewContext?: {
    completedReview: string,
    openQuestionAnswers: { question: string, answer: string }[]
  }
): string
```

If reviewContext is provided, prepend to the user message:
```
Previous milestone review:
[completedReview]

Open questions resolved:
[openQuestionAnswers as Q: / A: pairs]
```

---

## Manual Step Reminder Pattern

Add to `.cursorrules`:
After any migration file is generated, surface it explicitly at the TOP of the completion summary as:
"⚠️ MANUAL STEP REQUIRED: run `npx supabase db push` before testing."

---

## What is NOT in This Milestone

- Artifact version history (V2)
- Diff view on regeneration (V2)
- Milestone sequencing / automated build plan (V2)
- Export to GitHub (V2)

---

## Assumptions Made

- Replaced `ArtifactCard` (2×2 grid) with `ArtifactRow` (full-width collapsible rows). One row expanded at a time.
- Display names and download filenames computed in `lib/artifacts/naming.ts` and passed to rows as props — not derived in components.
- Next milestone generation increments `sequence_number` via `next_milestone: true` API flag; regenerate keeps the same sequence.
- REVIEW row display name tracks the current milestone `sequence_number` (REVIEW_01 when milestone is 01).
- Review gate state is UI-only (resets on navigation). Gate appears via "Generate MILESTONE_XX" button after first milestone exists.
- Review markdown parser looks for `## Open Questions` and `## Manual Steps` list items.
- `QuestionRound` reused for open-questions step with a no-op regenerate handler.
- No DB migration required for this milestone.

## Open Questions

_(Cursor stops and adds here if ambiguity is unresolvable)_
