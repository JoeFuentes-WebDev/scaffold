# MILESTONE_04a-4a — Tests: Pure Function Critical Paths

## What this milestone does

Adds tests for pure functions that have no external dependencies.
No mocking required. No DB. No API calls.
Three targets: `parseReviewMarkdown`, `isArtifactReady`, Zod schemas.

## Ambiguity protocol

If you encounter a decision not covered here:
- If a safe assumption exists, make it, record it under ## Assumptions Made, and continue
- If no safe assumption exists, stop and add the question to ## Open Questions — do not guess

---

## Architectural invariants — enforced in this milestone

- Tests live in `/__tests__/` mirroring the source folder structure
- No test touches the DB, Anthropic API, or any external service
- Each test file covers exactly one module
- Tests are descriptive — test name explains what behavior is being verified

---

## Step 1 — Install test framework

Check if Jest or Vitest is already installed:
```bash
cat package.json | grep -E "jest|vitest"
```

If neither is installed, install Vitest (preferred for Next.js + TypeScript):
```bash
npm install -D vitest @vitejs/plugin-react vite
```

Add to `package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

Create `vitest.config.ts` in project root:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

---

## Step 2 — parseReviewMarkdown tests

Create `/__tests__/lib/services/reviewParser.test.ts`

Test cases:

**Happy path — open questions extracted correctly:**
```ts
it('extracts open questions from a filled-in review', () => {
  const markdown = `
## 5. Open Questions
| # | Question | Impact if Not Resolved |
|---|----------|------------------------|
| 1 | Should we use Zod or Yup? | Affects all API routes |
| 2 | What Node version? | Affects deployment |
`
  const result = parseReviewMarkdown(markdown)
  expect(result.openQuestions).toHaveLength(2)
  expect(result.openQuestions[0]).toContain('Zod or Yup')
})
```

**Happy path — manual steps extracted correctly:**
```ts
it('extracts manual steps from a filled-in review', () => {
  const markdown = `
## 6b. Manual Steps Required
| # | Step | Why Required |
|---|------|--------------|
| 1 | Run npx supabase db push | Schema migration |
`
  const result = parseReviewMarkdown(markdown)
  expect(result.manualSteps).toHaveLength(1)
  expect(result.manualSteps[0]).toContain('supabase db push')
})
```

**Empty template — no questions, no steps:**
```ts
it('returns empty arrays for a blank template', () => {
  const markdown = `
## 5. Open Questions
| # | Question | Impact if Not Resolved |
|---|----------|------------------------|
|   |          |                        |
`
  const result = parseReviewMarkdown(markdown)
  expect(result.openQuestions).toHaveLength(0)
})
```

**Missing section — does not throw:**
```ts
it('returns empty arrays when Open Questions section is missing', () => {
  const markdown = `# REVIEW_01\n\nNo questions section here.`
  const result = parseReviewMarkdown(markdown)
  expect(result.openQuestions).toHaveLength(0)
  expect(result.manualSteps).toHaveLength(0)
})
```

---

## Step 3 — isArtifactReady tests

Create `/__tests__/lib/services/domainThresholds.test.ts`

Test cases:

**ONBOARDING ready when product, architecture, tech_stack complete:**
```ts
it('returns ready for ONBOARDING when required domains are complete', () => {
  const domains = [
    { name: 'product', status: 'complete' },
    { name: 'architecture', status: 'complete' },
    { name: 'tech_stack', status: 'complete' },
    { name: 'scope', status: 'in_progress' },
  ]
  expect(isArtifactReady('onboarding', domains)).toBe(true)
})
```

**ONBOARDING not ready when one required domain is missing:**
```ts
it('returns not ready for ONBOARDING when architecture is not complete', () => {
  const domains = [
    { name: 'product', status: 'complete' },
    { name: 'architecture', status: 'in_progress' },
    { name: 'tech_stack', status: 'complete' },
  ]
  expect(isArtifactReady('onboarding', domains)).toBe(false)
})
```

**MILESTONE ready when product, scope, architecture, engineering_rules complete:**
```ts
it('returns ready for milestone when all four required domains are complete', () => {
  const domains = [
    { name: 'product', status: 'complete' },
    { name: 'scope', status: 'complete' },
    { name: 'architecture', status: 'complete' },
    { name: 'engineering_rules', status: 'complete' },
  ]
  expect(isArtifactReady('milestone', domains)).toBe(true)
})
```

**ENV_MANIFEST ready when tech_stack and deployment complete:**
```ts
it('returns ready for env_manifest when tech_stack and deployment are complete', () => {
  const domains = [
    { name: 'tech_stack', status: 'complete' },
    { name: 'deployment', status: 'complete' },
  ]
  expect(isArtifactReady('env_manifest', domains)).toBe(true)
})
```

**getMissingDomains returns correct list:**
```ts
it('returns missing domain names for ONBOARDING', () => {
  const domains = [
    { name: 'product', status: 'complete' },
    { name: 'architecture', status: 'in_progress' },
    { name: 'tech_stack', status: 'locked' },
  ]
  const missing = getMissingDomains('onboarding', domains)
  expect(missing).toContain('architecture')
  expect(missing).toContain('tech_stack')
  expect(missing).not.toContain('product')
})
```

---

## Step 4 — Zod schema tests

Create `/__tests__/lib/schemas/index.test.ts`

Test cases:

**CreateProjectSchema rejects empty name:**
```ts
it('rejects empty project name', () => {
  const result = CreateProjectSchema.safeParse({
    name: '',
    seed_what: 'something',
    seed_who: 'someone',
    seed_boundary: 'something',
  })
  expect(result.success).toBe(false)
})
```

**CreateProjectSchema accepts valid input:**
```ts
it('accepts valid project creation input', () => {
  const result = CreateProjectSchema.safeParse({
    name: 'My Project',
    seed_what: 'A todo app',
    seed_who: 'Individual developers',
    seed_boundary: 'V1: basic CRUD only',
  })
  expect(result.success).toBe(true)
})
```

**GenerateRoundSchema rejects invalid UUID:**
```ts
it('rejects invalid project_id UUID', () => {
  const result = GenerateRoundSchema.safeParse({
    project_id: 'not-a-uuid',
    domain_name: 'product',
  })
  expect(result.success).toBe(false)
})
```

**EvaluateRoundSchema rejects empty answers array:**
```ts
it('rejects empty answers array', () => {
  const result = EvaluateRoundSchema.safeParse({
    project_id: '123e4567-e89b-12d3-a456-426614174000',
    domain_name: 'product',
    round_id: '123e4567-e89b-12d3-a456-426614174001',
    answers: [],
  })
  expect(result.success).toBe(false)
})
```

**GenerateArtifactSchema rejects invalid artifact_type:**
```ts
it('rejects invalid artifact type', () => {
  const result = GenerateArtifactSchema.safeParse({
    project_id: '123e4567-e89b-12d3-a456-426614174000',
    artifact_type: 'invalid_type',
  })
  expect(result.success).toBe(false)
})
```

---

## Step 5 — Run tests

```bash
npm test
```

All tests must pass. If any fail, fix the test or the function — do not skip.

Record pass/fail count in ## Assumptions Made.

---

## Step 6 — Verify build still passes

```bash
npm run build
```

---

## What is NOT in this milestone

- Service tests with mocking (M4a-4b)
- API route tests (M4a-4c)
- UI component tests
- Coverage thresholds

---

## Assumptions Made

- Vitest was not previously installed; added `vitest`, `@vitejs/plugin-react`, and `vite` as devDependencies with `vitest.config.ts` and npm scripts.
- **Test results:** 14 passed, 0 failed (3 test files). `npm run build` passes.
- **`parseReviewMarkdown`:** The implementation parses bullet (`- item`) and numbered (`1. item`) lists only, not markdown tables. Happy-path review tests use list format; the blank-template test still uses the table format from the milestone doc (expects 0 items, which matches actual behavior).
- **`isArtifactReady` / `getMissingDomainsForArtifact`:** Actual signatures are `(domains, artifactType)` and `getMissingDomainsForArtifact(domains, artifactType)` — not the reversed argument order or `getMissingDomains` name shown in the milestone examples. Tests use a `makeDomain` helper supplying the full `Domain` type.
- **`CreateProjectSchema`:** Actual shape uses nested `seed_answers.{what_it_does, who_it_is_for, v1_boundary}` — not flat `seed_what` / `seed_who` / `seed_boundary` from the milestone examples.

## Open Questions

_(Cursor stops and adds here if ambiguity is unresolvable)_
