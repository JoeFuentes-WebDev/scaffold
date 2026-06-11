# MILESTONE_03 — Artifact Generation

## What this milestone builds

- Documents tab: four artifact cards with Generate buttons, threshold checks, greyed states with tooltips
- API route for each artifact type: assembles ProjectModel, calls Claude, returns markdown
- Inline artifact preview with markdown rendering
- Download individually or Download All
- Regenerate on demand (overwrites previous, no version history at V1)
- Each artifact has a two-section structure: human-readable summary + Cursor directive

## Ambiguity protocol

If you encounter a decision not covered here:
- If a safe assumption exists, make it, record it under ## Assumptions Made, and continue
- If no safe assumption exists, stop and add the question to ## Open Questions — do not guess

---

## Artifact Thresholds

Generate button is active only when all required domains are marked `complete`.
Greyed with a tooltip listing missing domains when not ready.

| Artifact | Required Domains |
|---|---|
| ONBOARDING.md | product, architecture, tech_stack |
| MILESTONE_XX.md | product, scope, architecture, engineering_rules |
| REVIEW_XX.md | architecture, engineering_rules |
| ENV_MANIFEST.md | tech_stack, deployment |

---

## New Files This Milestone

```
/app/api/artifacts/generate/route.ts     — single route handles all artifact types
/lib/prompts/artifacts/onboarding.ts     — prompt builder for ONBOARDING.md
/lib/prompts/artifacts/milestone.ts      — prompt builder for MILESTONE_XX.md
/lib/prompts/artifacts/review.ts         — prompt builder for REVIEW_XX.md
/lib/prompts/artifacts/envManifest.ts    — prompt builder for ENV_MANIFEST.md
/lib/services/artifactService.ts         — artifact business logic
/lib/data/artifacts.ts                   — Supabase queries for artifacts
/components/artifacts/ArtifactCard.tsx   — card with Generate button + state
/components/artifacts/ArtifactPreview.tsx — inline markdown preview + download
/components/artifacts/DocumentsWorkspace.tsx — Documents tab content area
```

---

## API Route

`POST /api/artifacts/generate`

Request:
```ts
{ project_id: string, artifact_type: 'onboarding' | 'milestone' | 'review' | 'env_manifest' }
```

Route:
1. Validate artifact_type
2. Check all required domains are `complete` — return 400 if not, list missing domains
3. Assemble full ProjectModel from Supabase (all domains + all rounds)
4. Call the correct prompt builder
5. Call Claude API — stream response
6. Save generated markdown to `artifacts` table (upsert by project_id + artifact_type)
7. Return markdown content

Use streaming so the preview renders as Claude generates. Do not wait for full completion before showing output.

---

## Artifact Content Spec

Each artifact has two sections separated by a horizontal rule (`---`).

### Section 1 — Human Summary
- 3-5 lines maximum
- Plain language
- States: what this artifact is for, what state the project is in, when to regenerate
- Written for the developer to read before handing to Cursor
- Never includes instructions for Claude

### Section 2 — Cursor Directive
- Written entirely for Claude/Cursor
- Dense, structured, unambiguous
- No filler, no pleasantries, no hedging
- Every rule stated once, clearly
- Assumes Cursor has read nothing else about this project

---

## Prompt Specifications

### ONBOARDING.md — `/lib/prompts/artifacts/onboarding.ts`

Purpose: Cursor reads this at the start of every session. Prevents context drift. The persistent project bible.

System prompt:
```
You are generating an ONBOARDING.md file for a software project.
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

Tone: direct, dense, structured. Written for a machine, not a human.
No filler. No preamble. No "here is your ONBOARDING.md".
Return only the markdown content.
```

User message: full ProjectModel assembled from all completed domains and rounds.

---

### MILESTONE_XX.md — `/lib/prompts/artifacts/milestone.ts`

Purpose: One change, one Cursor session. Tells Cursor exactly what to build, why, what to leave alone, and what to do when it hits ambiguity.

System prompt:
```
You are generating a MILESTONE_XX.md file for a software project.
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

Tone: direct, scoped, unambiguous. One change only.
Do not invent scope. Only include what the ProjectModel and current build phase support.
Return only the markdown content.
```

User message: full ProjectModel + current milestone number (auto-incremented from existing artifacts).

---

### REVIEW_XX.md — `/lib/prompts/artifacts/review.ts`

Purpose: Cursor self-audits after completing a milestone. What was built, what changed, what was assumed, what is still open.

System prompt:
```
You are generating a REVIEW_XX.md template for a software project.
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
5. Open questions — anything unresolved that the developer needs to decide
6. Risks — anything that could break silently or needs manual verification
7. Layer violations — any place where layers were combined (should be none)
8. Engineering rule violations — any rule that was bent or broken (should be none)
9. Ready to proceed — yes/no with reasoning

Tone: structured, honest, no hedging. Cursor fills this in truthfully.
Return only the markdown template with empty fields for Cursor to complete.
```

User message: full ProjectModel + milestone number being reviewed.

---

### ENV_MANIFEST.md — `/lib/prompts/artifacts/envManifest.ts`

Purpose: Every service, credential, and environment variable that must exist before the project runs. Step-by-step setup for every external dependency.

System prompt:
```
You are generating an ENV_MANIFEST.md file for a software project.
This file documents everything that must exist before `npm run dev` succeeds.
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

Tone: specific, sequential, no assumed knowledge. If a step requires back-and-forth between two services, call that out explicitly.
Return only the markdown content.
```

User message: full ProjectModel focusing on tech_stack and deployment domains.

---

## Documents Tab UI

### DocumentsWorkspace component

Renders four ArtifactCard components in a 2x2 grid.

Each ArtifactCard shows:
- Artifact name (ONBOARDING.md, MILESTONE_XX.md, REVIEW_XX.md, ENV_MANIFEST.md)
- One-line description of what it's for
- Required domains list
- Status: Ready to Generate / Missing: [domain list]
- Generate button — active when ready, greyed when not
- Last generated timestamp if artifact exists
- Regenerate button if artifact already exists (replaces Generate)

### ArtifactPreview component

Opens inline (not a modal, not a new page) below the ArtifactCard when Generate completes.

- Renders markdown with syntax highlighting
- Streams content as Claude generates — do not wait for completion
- Download button (individual file)
- Close/collapse button
- "Regenerate" button at bottom

### Download All button

At the top of DocumentsWorkspace.
Active only when at least one artifact has been generated.
Downloads a zip containing all generated artifacts as .md files.
Use the `jszip` library. Add to package.json if not present — flag as assumption.

---

## Streaming Implementation

Use the Vercel AI SDK or native ReadableStream for streaming.
Do not use a third-party streaming library unless it is already in the stack.
If neither Vercel AI SDK nor native streaming is already set up, flag as Open Question before implementing.

The client receives streamed markdown and renders it progressively in ArtifactPreview.
Use a `useState` string that appends chunks as they arrive.

---

## Artifact Naming

- ONBOARDING.md — fixed name
- MILESTONE_XX.md — XX = zero-padded milestone number, auto-incremented. First generation = MILESTONE_01.md.
- REVIEW_XX.md — XX matches the most recent MILESTONE number.
- ENV_MANIFEST.md — fixed name

Store the artifact_type in Supabase. Derive the filename on download.

---

## Error Handling

- If Claude returns an incomplete stream: save what was received, mark artifact status `partial`, show warning in UI
- If generation fails entirely: show error in ArtifactCard, do not overwrite existing artifact
- Never surface raw Claude output or stack traces to the client

---

## What Is NOT in This Milestone

- Artifact version history (V2)
- Diff view on regeneration (V2)
- Milestone sequencing / build plan generation (V2)
- Export to GitHub / push to repo (V2)

---

## Assumptions Made

- Installed `jszip`, `react-markdown`, `remark-gfm`, `rehype-highlight`, and `highlight.js` for Download All zip and markdown preview with syntax highlighting.
- Streaming uses native `ReadableStream` with `@anthropic-ai/sdk` message streaming (no Vercel AI SDK — not in stack).
- Added `sequence_number` column and unique index on `(project_id, artifact_type)` via `supabase/migrations/002_artifacts_sequence.sql` for milestone/review naming and upsert.
- Added `partial` artifact status for interrupted streams.
- MILESTONE/REVIEW sequence numbers default to `01`; regenerate overwrites same sequence (no version history at V1).
- REVIEW sequence matches the current milestone artifact's sequence number.
- `GET /api/artifacts?project_id=` added to load artifact list for DocumentsWorkspace.

## Open Questions

_(Cursor stops and adds here if ambiguity is unresolvable)_
