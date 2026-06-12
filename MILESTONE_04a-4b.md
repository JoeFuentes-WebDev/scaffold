# MILESTONE_04a-4b — Tests: generateRound Service

## What this milestone does

Adds tests for `generateRound` in `lib/services/roundService.ts`.
Requires mocking Supabase client and Anthropic client.
No real DB calls. No real API calls.

## Ambiguity protocol

If you encounter a decision not covered here:
- If a safe assumption exists, make it, record it under ## Assumptions Made, and continue
- If no safe assumption exists, stop and add the question to ## Open Questions — do not guess

---

## Architectural invariants — enforced in this milestone

- Tests never call real Supabase or Anthropic APIs
- All external dependencies mocked at the module level
- Mock responses match the exact shape the real services return
- Each test is independent — no shared state between tests

---

## Step 1 — Audit generateRound

Before writing any tests, read `lib/services/roundService.ts` and document:
- What arguments does `generateRound` accept?
- What Supabase queries does it make (in what order)?
- What does it pass to the Anthropic API?
- What does it return on success?
- What does it throw on failure?

Record in ## Assumptions Made before writing any test.

---

## Step 2 — Set up mocks

Create `/__tests__/lib/services/roundService.test.ts`

Mock Supabase client:
```ts
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  })),
}))
```

Mock Anthropic client (adjust path to match actual client location):
```ts
vi.mock('@/lib/claude/client', () => ({
  anthropic: {
    messages: {
      stream: vi.fn(),
    },
  },
}))
```

---

## Step 3 — Test cases

**Happy path — round generated successfully:**
```ts
it('generates a round with questions from Claude', async () => {
  // Mock project fetch returning valid project
  // Mock existing rounds fetch returning empty array
  // Mock Claude returning valid questions JSON:
  // { questions: [{ id: 'q1', text: 'What does it do?' }] }
  // Mock round insert returning saved round
  // Mock domain status update returning success

  const result = await generateRound(mockSupabase, projectId, 'product')

  expect(result.questions).toHaveLength(/* whatever Claude returned */)
  expect(result.status).toBe('pending')
  expect(result.domain_name).toBe('product')
})
```

**Existing pending round — returns existing, does not create duplicate:**
```ts
it('returns existing pending round without creating a new one', async () => {
  // Mock existing rounds fetch returning one round with status 'pending'
  // Expect NO call to round insert
  // Expect the existing round to be returned

  const result = await generateRound(mockSupabase, projectId, 'product')
  expect(insertMock).not.toHaveBeenCalled()
  expect(result.status).toBe('pending')
})
```

**Claude returns malformed JSON — throws:**
```ts
it('throws when Claude returns malformed JSON', async () => {
  // Mock Claude returning invalid JSON string
  await expect(
    generateRound(mockSupabase, projectId, 'product')
  ).rejects.toThrow()
})
```

**Project not found — throws:**
```ts
it('throws when project does not exist', async () => {
  // Mock project fetch returning null or error
  await expect(
    generateRound(mockSupabase, 'non-existent-id', 'product')
  ).rejects.toThrow()
})
```

---

## Step 4 — Run tests

```bash
npm test
```

All previously passing tests must still pass (14 from M4a-4a).
New tests must pass.
Record total pass count in ## Assumptions Made.

---

## Step 5 — Verify build

```bash
npm run build
```

---

## What is NOT in this milestone

- evaluateRound tests (M4a-4c)
- checkDomainUnlocks tests (M4a-4d)
- API route tests (M4a-4e)

---

## Assumptions Made

### generateRound audit

- **Arguments:** `(supabase: SupabaseClient, projectId: string, domainName: string, options?: { forceRegenerate?: boolean })`
- **Flow (when not `forceRegenerate`):**
  1. `getPendingRoundForDomain` — if pending round exists, return it immediately (no Claude, no insert)
  2. `getProjectById` — throws `"Project not found"` if null
  3. `getRoundsForProject` + `getRoundsForDomain` — context for prompts and next round number
  4. `callClaude(systemPrompt, userPrompt)` — Anthropic via `anthropic.messages.create` (not stream)
  5. `parseClaudeJson<GenerateQuestionsResponse>` — expects `{ questions: [...] }`; throws wrapped as `"Something went wrong generating questions. Please try again."`
  6. `createRound` — inserts round with `status: "pending"`
  7. `getDomainByName` + `updateDomainStatus("in_progress")` — only when domain status is `"available"`
- **Returns:** `Round` on success
- **Throws:** `"Project not found"`, malformed/empty Claude JSON (wrapped message above)

### Mock strategy

- Milestone examples mock `@/lib/supabase/server` and `anthropic.messages.stream`; actual code delegates to `@/lib/data/*` and `callClaude` (`messages.create`). Tests mock `@/lib/data/projects`, `@/lib/data/rounds`, `@/lib/data/domains`, and `callClaude` (keeping real `parseClaudeJson`) via `vi.hoisted()`.
- Supabase client passed to `generateRound` is an empty stub — never hits real DB.

### Test results

- **18 passed**, 0 failed (4 test files: 14 from M4a-4a + 4 new). `npm run build` passes.

## Open Questions

_(Cursor stops and adds here if ambiguity is unresolvable)_
