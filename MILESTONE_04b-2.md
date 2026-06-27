# MILESTONE_04b-2 — UX and Product Features

## What this milestone builds

Seven UX and product improvements across the questionnaire flow and Documents tab.
No architectural changes. No DB migrations unless noted.

## Ambiguity protocol

If you encounter a decision not covered here:
- If a safe assumption exists, make it, record it under ## Assumptions Made, and continue
- If no safe assumption exists, stop and add the question to ## Open Questions — do not guess

---

## Architectural invariants — enforced in this milestone

- Components never import from /lib/services directly
- All Claude API calls server-side only
- No inline functions in components
- All new API routes must have try/catch using handleRouteError

---

## Feature 1 — Auto-generate REVIEW template alongside MILESTONE

**Problem:** REVIEW template must be generated separately after MILESTONE. Should be automatic.

**Fix:**
When `POST /api/artifacts/generate` generates a MILESTONE artifact, immediately generate the matching REVIEW template in the same request before returning.

In `artifactService.streamArtifactGeneration`:
- After MILESTONE content is fully streamed and saved, call `generateReviewTemplate(project_id, sequence_number)` 
- Save REVIEW artifact with `status = 'template_generated'` and matching `sequence_number`
- Return both artifact IDs in the response

In the Documents tab UI:
- REVIEW row should appear automatically after MILESTONE is generated
- REVIEW card displays label: "Template — give to Cursor to complete after MILESTONE_XX"
- REVIEW row is not expandable until status = `uploaded` or `processed`
- REVIEW download button active immediately (template is downloadable)

No separate Generate button for REVIEW. It is never manually triggered.

---

## Feature 2 — Cleaner milestone progression flow

**Problem:** Current UX conflates opening the gate with generating the next milestone. Button label and flow are confusing.

**Fix:** Replace the current gate trigger with a three-step explicit sequence:

**Step 1 — After MILESTONE_01 is generated:**
Show a new button below the MILESTONE row: `[ Continue to MILESTONE_02 ]` (secondary style, not blue)
This button only appears when:
- MILESTONE_N exists with status = `generated`
- REVIEW_N exists with status = `template_generated`, `uploaded`, or `processed`

**Step 2 — After clicking Continue:**
Expand an upload section below the MILESTONE row:
```
Upload completed REVIEW_01.md
[ Choose File ]
Skip (generate without review)
```
Upload sets REVIEW status to `uploaded` and triggers parse.

**Step 3 — After upload (or skip):**
Show `[ Generate MILESTONE_02 ]` in blue (primary style).
If skipped: show warning "Generating without a completed review. Open questions may be missed."
Clicking Generate runs the existing gate flow (open questions round, manual steps checklist) then generates.

This makes the sequence explicit: Continue → Upload → Generate.

---

## Feature 3 — Clippable questions

**Problem:** No way to copy individual questions or all questions from a round.

**Fix:**
In `QuestionRound.tsx`, add to each question:
- A clipboard icon button to the right of the question text
- Clicking copies that question text to clipboard using `navigator.clipboard.writeText()`
- Brief "Copied!" tooltip confirmation (200ms, then disappears)

At the round level, add:
- "Copy all questions" text button above the question list
- Clicking copies all questions as a numbered list:
```
1. [question text]
2. [question text]
3. [question text]
```

No external clipboard library — use native `navigator.clipboard` API.

---

## Feature 4 — Clarification acknowledgment

**Problem:** After submitting a clarification, nothing confirms Claude understood it. The clarification field just disappears.

**Fix:**
After `POST /api/rounds/clarify` succeeds, make a second call to Claude to generate a one-line acknowledgment:

New API route: `POST /api/rounds/clarify-ack`
- Accepts: `{ project_id, domain_name, clarification_text }`
- Sends clarification text to Claude with prompt: "In one sentence, confirm what you understood from this clarification. Be specific, not generic."
- Returns: `{ acknowledgment: string }`

In `DomainWorkspace.tsx`, after clarification submits:
- Show the acknowledgment in a subtle callout below the clarification field:
  > "Got it — [acknowledgment text]"
- Auto-dismiss after 4 seconds or on user click
- If the ack call fails, fail silently — don't block the clarification submission

---

## Feature 5 — Decision Support Mode

**Problem:** When answering questionnaire questions, users sometimes don't know the best answer. No way to get options.

**Fix:**
Add an "I'm not sure" button below each question textarea (alongside the existing N/A checkbox).

When clicked:
1. Calls `POST /api/rounds/suggest-options`
   - Accepts: `{ project_id, domain_name, question_text }`
   - Assembles ProjectModel context
   - Sends to Claude: "Given this project context, suggest 2-3 concrete options for answering this question. For each option, give a one-line tradeoff. Return only JSON: { options: [{ label, description, tradeoff }] }"
   - Returns options array

2. Renders options as selectable cards below the question:
```
┌─────────────────────────────────────────┐
│ Option A: [label]                        │
│ [description]                            │
│ Tradeoff: [tradeoff]                     │
│                          [ Use this ]    │
└─────────────────────────────────────────┘
```

3. Clicking "Use this" fills the textarea with the option description. User can edit before submitting.

4. Options dismiss when user starts typing in the textarea manually.

Button label: "I'm not sure — show me options"
Only visible when textarea is empty.
One question can have options open at a time — opening another closes the current one.

---

## Feature 6 — Configurable model per artifact type

**Problem:** All artifact generation uses the same model. Opus would produce sharper ONBOARDING and MILESTONE output.

**Fix:**

Create `/lib/config/models.ts`:
```ts
export const ARTIFACT_MODELS: Record<string, string> = {
  onboarding:   'claude-opus-4-6',
  milestone:    'claude-opus-4-6',
  review:       'claude-sonnet-4-6',
  env_manifest: 'claude-sonnet-4-6',
}

export const DEFAULT_MODEL = 'claude-sonnet-4-6'

export function getModelForArtifact(artifactType: string): string {
  return ARTIFACT_MODELS[artifactType] ?? DEFAULT_MODEL
}
```

In `artifactService.ts`, replace hardcoded model string with:
```ts
import { getModelForArtifact } from '@/lib/config/models'
const model = getModelForArtifact(artifactType)
```

Also use `DEFAULT_MODEL` for round generation and evaluation (keep as Sonnet).

No UI needed for V1 — config only. V2 can add per-project model selection.

---

## Feature 7 — REVIEW template format audit and fix

**Problem:** REVIEW template uses markdown tables for Open Questions and Manual Steps sections. The parser (`reviewParser.ts`) extracts from bullet/numbered lists only. If Cursor fills in the template using tables, the gate silently skips the questions.

**Step 1 — Audit:**
Generate a REVIEW template from the current app. Check the Open Questions and Manual Steps sections — are they tables or lists?

**Step 2 — Fix the template prompt:**
In `/lib/prompts/artifacts/review.ts`, update the system prompt to use numbered lists for Open Questions and Manual Steps instead of tables:

```markdown
### 5. Open Questions

1. [Question text] — Impact: [impact if not resolved]
2. [Question text] — Impact: [impact if not resolved]

> If none: No open questions.

### 6. Manual Steps Required

1. [Step description] — Why: [reason]
2. [Step description] — Why: [reason]

> If none: No manual steps required.
```

**Step 3 — Verify parser:**
Generate a new REVIEW template, manually fill in 2 open questions and 1 manual step using the list format, upload it through the gate, and confirm the parser surfaces them correctly.

---

## Verify

```bash
npm test
```

All 35 tests must still pass.

```bash
npm run build
```

Must pass.

Smoke test:
- Generate a MILESTONE — confirm REVIEW template auto-generates alongside it
- Click "Continue to MILESTONE_02" — confirm three-step flow
- Copy a question — confirm clipboard works
- Submit a clarification — confirm acknowledgment appears
- Click "I'm not sure" on a question — confirm options appear
- Generate ONBOARDING — confirm it uses Opus (check Vercel logs for model name)
- Generate a REVIEW template — confirm Open Questions uses numbered list format

---

## What is NOT in this milestone

- REVIEW_00 flow (V2)
- Tool-agnostic agent configuration (V2)
- Repo scan (V2)
- Multi-user support (V2)

---

## Assumptions Made

- **Feature 1:** REVIEW auto-generation runs server-side after milestone stream completes; UI refreshes via `loadArtifacts()` rather than relying on a separate API response field for the review artifact ID.
- **Feature 2:** Upload step lives in `DocumentsWorkspace` progression panel; `ReviewGate` receives `hideUploadStep` and pre-parsed review state from the parent.
- **Feature 5:** Decision Support Mode is enabled only when `QuestionRound` receives `projectId` and `domainName` (domain questionnaire). Review-gate open questions do not expose suggest-options.
- **Feature 6:** Model IDs use `claude-opus-4-6` / `claude-sonnet-4-6` as specified; round generate/evaluate continue using `DEFAULT_MODEL` (Sonnet) via `callClaude` default parameter.

## Open Questions

_(None — all decisions had safe assumptions.)_
