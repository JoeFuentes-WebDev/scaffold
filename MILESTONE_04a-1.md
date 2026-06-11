# MILESTONE_04a-1 — Zod Validation on All API Routes

## What this milestone does

Replaces all hand-written request validators in API routes with Zod schemas.
No business logic changes. No component changes. API routes only.

## Ambiguity protocol

If you encounter a decision not covered here:
- If a safe assumption exists, make it, record it under ## Assumptions Made, and continue
- If no safe assumption exists, stop and add the question to ## Open Questions — do not guess

---

## Architectural invariants — enforced in this milestone

- API routes are thin: validate input → call service → return response
- No business logic in API routes
- All validation at the API boundary via Zod — never trust raw request body

---

## Step 1 — Audit

Before writing any code, list every API route file in /app/api/ and identify:
- What fields it currently validates
- How it currently validates (hand-written checks, if statements, etc.)
- What the correct Zod schema should be

Record the audit in ## Assumptions Made before proceeding.

---

## Step 2 — Install Zod

```bash
npm install zod
```

Confirm it is not already installed. If it is, skip install and note it.

---

## Step 3 — Create shared schema file

Create `/lib/schemas/index.ts`.

This file exports all Zod schemas used across API routes. Do not define schemas inline in route files — define them here and import.

Schemas to define (add more based on audit):

```ts
import { z } from 'zod'

export const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  project_type: z.enum(['new', 'existing']).default('new'),
  seed_what: z.string().min(1, 'Required'),
  seed_who: z.string().min(1, 'Required'),
  seed_boundary: z.string().min(1, 'Required'),
})

export const GenerateRoundSchema = z.object({
  project_id: z.string().uuid(),
  domain_name: z.string().min(1),
})

export const EvaluateRoundSchema = z.object({
  project_id: z.string().uuid(),
  domain_name: z.string().min(1),
  round_id: z.string().uuid(),
  answers: z.array(z.object({
    question_id: z.string(),
    answer: z.string(),
  })).min(1),
})

export const GenerateArtifactSchema = z.object({
  project_id: z.string().uuid(),
  artifact_type: z.enum(['onboarding', 'milestone', 'review', 'env_manifest']),
  regenerate: z.boolean().optional(),
  next_milestone: z.boolean().optional(),
  review_context: z.object({
    completedReview: z.string(),
    openQuestionAnswers: z.array(z.object({
      question: z.string(),
      answer: z.string(),
    })),
  }).optional(),
})

export const UpdateDomainStatusSchema = z.object({
  status: z.enum(['locked', 'available', 'in_progress', 'complete']),
})

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
})
```

Add any additional schemas found during the audit.

---

## Step 4 — Replace validators in each API route

For each API route:
1. Import the correct schema from `/lib/schemas/index.ts`
2. Replace hand-written validation with:

```ts
const body = await request.json()
const parsed = SomeSchema.safeParse(body)
if (!parsed.success) {
  return NextResponse.json(
    { error: 'Invalid request', details: parsed.error.flatten() },
    { status: 400 }
  )
}
const data = parsed.data
```

3. Use `parsed.data` for all subsequent logic — never use raw `body`
4. Remove all hand-written validation checks

---

## Step 5 — Verify

After all routes are updated, run `npm run build` — must pass with no type errors.

Then run `npm run dev` and test both happy path and error paths:

**Happy path — confirm nothing broke:**
- Create a project with valid inputs → 200, project created
- Generate a round → 200, questions returned
- Submit answers → 200, evaluation returned
- Generate an artifact → streams correctly

**Error paths — confirm Zod is actually wired:**
- Create project with empty name → must return 400 `{ error: 'Invalid request', details: {...} }`
- Generate round with invalid UUID as project_id → must return 400
- Submit answers with empty answers array → must return 400
- Generate artifact with invalid artifact_type → must return 400

If error paths return 500 or 200, Zod is not connected — do not proceed to M4a-2.
If error paths return 400 with the correct shape, Zod is working. Commit and move on.

---

## What is NOT in this milestone

- Component changes
- Business logic changes
- Layer restructure (M4a-2)
- Tests (M4a-4)
- Any new features

---

## Assumptions Made

### Step 1 — API route audit

| Route | Method | Fields validated | Previous validation | Zod schema |
|---|---|---|---|---|
| `/api/projects` | POST | `name`, `description?`, `project_type`, `seed_answers.*` | Hand-written trim + `validateColdStartSeedAnswers` | `CreateProjectSchema` |
| `/api/projects/[id]` | PATCH | `description` | Required trim check | `UpdateProjectSchema` |
| `/api/projects/[id]/regenerate-pending` | POST | `domain_names[]` | Non-empty array check | `RegeneratePendingSchema` |
| `/api/artifacts` | GET | `project_id` query | Trim check | `ProjectIdQuerySchema` |
| `/api/artifacts/generate` | POST | `project_id`, `artifact_type`, flags, `review_context?` | Hand-written type checks + `parseReviewContext` | `GenerateArtifactSchema` |
| `/api/rounds` | GET | `project_id`, `domain_name` query | Trim + `isValidDomainName` | `GetRoundsQuerySchema` |
| `/api/rounds/generate` | POST | `project_id`, `domain_name` | Trim + `isValidDomainName` | `GenerateRoundSchema` |
| `/api/rounds/evaluate` | POST | `project_id`, `domain_name`, `round_id`, `answers[]` | Hand-written checks | `EvaluateRoundSchema` |
| `/api/rounds/regenerate` | POST | `project_id`, `domain_name`, `round_id` | Hand-written checks | `RegenerateRoundSchema` |
| `/api/rounds/clarify` | POST | `project_id`, `domain_name`, `clarification` | Hand-written checks | `ClarifyRoundSchema` |
| `/api/domains/[id]/status` | PATCH | `status` | Enum membership check | `UpdateDomainStatusSchema` |
| `/api/domains/check-unlocks` | POST | `project_id` | Trim check | `CheckUnlocksSchema` |

- Milestone doc example used `seed_what` / `seed_who` / `seed_boundary` and camelCase `review_context` fields. Schemas match **existing client payloads**: nested `seed_answers` (`what_it_does`, `who_it_is_for`, `v1_boundary`) and snake_case `review_context` (`completed_review`, `open_question_answers`).
- `UpdateProjectSchema` validates `description` only (no `name`), matching current PATCH behavior — not the milestone doc's optional `name` field.
- UUID validation added for `project_id` and `round_id` where IDs are Supabase UUIDs (stricter than prior trim-only checks).
- Shared `invalidRequestResponse()` helper returns `{ error: 'Invalid request', details: flatten() }` per Step 4.
- Zod was not previously installed; added via `npm install zod`.

## Open Questions

_(Cursor stops and adds here if ambiguity is unresolvable)_
