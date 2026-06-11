# MILESTONE_02 — Claude API Integration: Questionnaire Flow

## What this milestone builds

- API route: generate Round 1 questions from project seed
- API route: evaluate answers, decide follow-up or advance to next domain
- Domain tab content: renders questions, accepts answers, handles submit
- Round state persisted to Supabase after each submission
- Domain status updates as rounds progress (available → in_progress → complete)
- Stop Here toggle to manually mark a domain complete
- Documents tab locked until minimum domain thresholds are met (fix from M1)

## Ambiguity protocol

If you encounter a decision not covered here:
- If a safe assumption exists, make it, record it under ## Assumptions Made, and continue
- If no safe assumption exists, stop and add the question to ## Open Questions — do not guess

---

## Claude API rules — non-negotiable

- All Anthropic API calls go through Next.js API routes only
- Never call the Anthropic API from a component or hook
- `ANTHROPIC_API_KEY` is server-side only — never referenced in any client file
- Use `claude-sonnet-4-6` as the model
- All prompts live in `/lib/prompts/` as named exported functions — never inline in API routes

---

## New files this milestone

```
/app/api/rounds/generate/route.ts     — generate questions for a domain
/app/api/rounds/evaluate/route.ts     — evaluate answers, return next action
/lib/prompts/generateQuestions.ts     — prompt builder for Round 1 + follow-up
/lib/prompts/evaluateAnswers.ts       — prompt builder for answer evaluation
/lib/services/roundService.ts         — round business logic
/lib/data/rounds.ts                   — Supabase queries for rounds
/lib/data/domains.ts                  — Supabase queries for domains
/components/project/QuestionRound.tsx — renders questions + answer inputs
/components/project/DomainWorkspace.tsx — domain tab content area
```

---

## Request Flow

### Step 1 — User clicks an Available domain tab

Client calls `POST /api/rounds/generate` with:
```ts
{ project_id, domain_name }
```

API route:
1. Fetch project row (name + description) from Supabase
2. Fetch all existing rounds for this project (full history)
3. Call `generateQuestions` prompt with seed + history
4. Claude returns 3-4 questions as JSON
5. Save new round to `rounds` table (status: `pending`)
6. Update domain status to `in_progress`
7. Return round to client

### Step 2 — User answers questions and submits

Client calls `POST /api/rounds/evaluate` with:
```ts
{ project_id, domain_name, round_id, answers: [{ question_id, answer }] }
```

API route:
1. Fetch full project context (all rounds across all domains)
2. Call `evaluateAnswers` prompt with full context + new answers
3. Claude returns a decision:
```ts
{
  action: 'follow_up' | 'advance',
  follow_up_questions?: Question[],   // present if action = follow_up
  domains_affected: string[],          // domains whose data was enriched
  domain_updates: Record<string, any>  // data to merge into affected domain rows
}
```
4. Save answers to the current round (status: `answered`)
5. If `follow_up`: create a new round for the same domain, return it
6. If `advance`: mark domain status `in_progress` (complete is manual via Stop Here)
7. Update `domains_affected` rows with `domain_updates` data
8. Unlock newly affected domains (status: `locked` → `available`) if they have enough context
9. Return action + next round (if follow_up) or null (if advance)

---

## Prompt Specifications

### `/lib/prompts/generateQuestions.ts`

```ts
export function buildGenerateQuestionsPrompt(
  project: { name: string; description: string },
  domain: string,
  existingRounds: Round[]
): string
```

System prompt:
```
You are a senior software architect helping an engineer document a software project.
Your job is to ask focused questions that build a complete picture of the project's ${domain} domain.

Rules:
- Ask 3-4 questions per round. Never more.
- Questions must be specific, not generic.
- Do not ask about things already answered in previous rounds.
- Each question should surface a decision, constraint, or assumption that affects how the project gets built.
- Return ONLY valid JSON. No preamble, no markdown, no explanation.

Return format:
{
  "questions": [
    { "id": "q1", "text": "..." },
    { "id": "q2", "text": "..." },
    { "id": "q3", "text": "..." }
  ]
}
```

User message: include project name, description, domain name, and a summary of all previous rounds.

### `/lib/prompts/evaluateAnswers.ts`

```ts
export function buildEvaluateAnswersPrompt(
  project: { name: string; description: string },
  domain: string,
  allRounds: Round[],
  currentAnswers: { question_id: string; answer: string }[]
): string
```

System prompt:
```
You are a senior software architect evaluating answers about a software project.

Given the answers just provided, decide:
1. Are there critical gaps in the ${domain} domain that require 1-2 follow-up questions?
2. What information from these answers enriches other domains?
3. What structured data should be stored in each affected domain?

Rules:
- Only ask follow-up questions if a gap is genuinely critical. Do not pad.
- Maximum 2 follow-up questions per round.
- domains_affected must list every domain whose understanding changed.
- domain_updates must contain the structured knowledge to store — Claude owns the shape.
- Return ONLY valid JSON. No preamble, no markdown, no explanation.

Return format:
{
  "action": "follow_up" | "advance",
  "follow_up_questions": [{ "id": "q1", "text": "..." }],
  "domains_affected": ["architecture", "tech_stack"],
  "domain_updates": {
    "architecture": { ... },
    "tech_stack": { ... }
  }
}
```

---

## Data Layer

### `/lib/data/rounds.ts`

```ts
export async function createRound(supabase, data: CreateRoundInput): Promise<Round>
export async function getRoundById(supabase, id: string): Promise<Round>
export async function updateRound(supabase, id: string, data: Partial<Round>): Promise<Round>
export async function getRoundsForProject(supabase, project_id: string): Promise<Round[]>
export async function getRoundsForDomain(supabase, project_id: string, domain_name: string): Promise<Round[]>
```

### `/lib/data/domains.ts`

```ts
export async function getDomainsForProject(supabase, project_id: string): Promise<Domain[]>
export async function getDomainByName(supabase, project_id: string, name: string): Promise<Domain>
export async function updateDomainStatus(supabase, id: string, status: DomainStatus): Promise<Domain>
export async function updateDomainData(supabase, id: string, data: Record<string, any>): Promise<Domain>
export async function unlockDomain(supabase, project_id: string, domain_name: string): Promise<void>
```

---

## Service Layer

### `/lib/services/roundService.ts`

```ts
export async function generateRound(
  supabase,
  project_id: string,
  domain_name: string
): Promise<Round>

export async function evaluateRound(
  supabase,
  project_id: string,
  domain_name: string,
  round_id: string,
  answers: { question_id: string; answer: string }[]
): Promise<EvaluateResult>
```

`generateRound`:
1. Fetch project + all existing rounds
2. Build prompt
3. Call Claude
4. Parse JSON response — wrap in try/catch, throw if malformed
5. Save round to DB
6. Update domain status to `in_progress`
7. Return round

`evaluateRound`:
1. Fetch full project context
2. Save answers to current round
3. Build prompt
4. Call Claude
5. Parse JSON response
6. Apply domain updates
7. Handle follow_up or advance
8. Return result

---

## UI Components

### `/components/project/QuestionRound.tsx`

Props:
```ts
{
  round: Round
  onSubmit: (answers: { question_id: string; answer: string }[]) => void
  isLoading: boolean
}
```

Renders:
- Each question as a labeled textarea (not a single-line input — answers need space)
- All questions visible at once, not one at a time
- Submit button disabled until all questions have non-empty answers
- Loading state while waiting for Claude evaluation
- No inline functions — all handlers declared externally and named

### `/components/project/DomainWorkspace.tsx`

Props:
```ts
{
  project_id: string
  domain: Domain
}
```

State machine for the content area:

```
domain.status === 'available'
  → Show "Start [Domain Name]" button
  → On click: call /api/rounds/generate, render QuestionRound

domain.status === 'in_progress'
  → Show active QuestionRound if pending round exists
  → Show answered rounds above (collapsed, readable summary)
  → Show "Stop Here" toggle at bottom

domain.status === 'complete'
  → Show all answered rounds (collapsed)
  → Show "Stop Here" toggle (checked)
  → Uncheck to reopen domain
```

### Stop Here toggle

- Lives at the bottom of DomainWorkspace
- Calls `PATCH /api/domains/[id]/status` with `{ status: 'complete' }` when checked
- Calls same endpoint with `{ status: 'in_progress' }` when unchecked
- No data is lost on either action
- When checked: re-evaluate which artifact Generate buttons should activate

---

## Documents Tab Fix (from M1)

Documents tab must be `locked` on project creation, not `available`.

Fix in `projectService.createProject`: when seeding domains, set Documents status to `locked`.

Documents unlocks when these domains are all `complete`:
- ONBOARDING.md requires: `product`, `architecture`, `tech_stack`
- MILESTONE_XX.md requires: `product`, `scope`, `architecture`, `engineering_rules`
- REVIEW_XX.md requires: `architecture`, `engineering_rules`
- ENV_MANIFEST.md requires: `tech_stack`, `deployment`

Documents tab status = `available` when at least one artifact's required domains are all complete.

Add a `checkDocumentsUnlock` function to `domainService` — called after every `Stop Here` toggle.

---

## Error Handling

- All Claude API calls wrapped in try/catch
- If Claude returns malformed JSON: log the raw response, return a 500 with a user-readable message ("Something went wrong generating questions. Please try again.")
- If a round already exists in `pending` state for a domain: return the existing round, do not create a duplicate
- Never surface raw Claude output or stack traces to the client

---

## What is NOT in this milestone

- Artifact generation (M3)
- Domain completion percentage / progress indicators (V2)
- Round history UI beyond simple collapsed view (V2)

---

## Assumptions Made

- Installed `@anthropic-ai/sdk` — required for Claude integration, not in the M1 stack.
- Claude calls live in `lib/claude/client.ts`, invoked only from `roundService` (which API routes call server-side).
- System prompts exported as `buildGenerateQuestionsSystemPrompt` / `buildEvaluateAnswersSystemPrompt` alongside user-message builders (milestone specifies user prompt as the string-returning function).
- Documents tab status is computed from domain completion states via `getDocumentsTabStatus` — not stored in DB. Locked by default until at least one artifact's required domains are all `complete`.
- Added `GET /api/rounds?project_id=&domain_name=` to load round history for `DomainWorkspace` (required for the UI state machine).
- When `in_progress` with no pending round (after Claude returns `advance`), a "Continue [Domain]" button re-calls generate to start the next round.
- Domains listed in `domains_affected` with updates are unlocked (`locked` → `available`) after evaluation.

## Open Questions

_(Cursor stops and adds here if ambiguity is unresolvable)_
