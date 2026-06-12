# MILESTONE_04a-4c — Tests: evaluateRound Service

## What this milestone does

Adds tests for `evaluateRound` in `lib/services/roundService.ts`.
Requires mocking the same dependencies as M4a-4b.
No real DB calls. No real API calls.

## Ambiguity protocol

If you encounter a decision not covered here:
- If a safe assumption exists, make it, record it under ## Assumptions Made, and continue
- If no safe assumption exists, stop and add the question to ## Open Questions — do not guess

---

## Architectural invariants — enforced in this milestone

- Tests never call real Supabase or Anthropic APIs
- Mock shapes must match what M4a-4b established — reuse the same mock setup
- Each test is independent — no shared state between tests

---

## Step 1 — Audit evaluateRound

Before writing any tests, read `lib/services/roundService.ts` and document:
- What arguments does `evaluateRound` accept?
- What Supabase queries does it make?
- What does it pass to Claude?
- What are the two possible return shapes (follow_up vs advance)?
- What domain updates does it apply on advance?
- What does it throw on failure?

Record in ## Assumptions Made before writing any test.

---

## Step 2 — Reuse mock setup from M4a-4b

Import or duplicate the mock setup established in `roundService.test.ts`.
Do not redefine mocks from scratch — use the same patterns so mock behavior is consistent.

---

## Step 3 — Test cases

**Happy path — advance action:**
```ts
it('evaluates answers and returns advance action', async () => {
  // Mock Claude returning:
  // { action: 'advance', domains_affected: ['architecture'], domain_updates: { architecture: { ... } } }
  // Mock round update saving answers
  // Mock domain data update applying domain_updates

  const result = await evaluateRound(mockSupabase, projectId, 'product', roundId, answers)

  expect(result.action).toBe('advance')
  expect(result.domains_affected).toContain('architecture')
})
```

**Happy path — follow_up action:**
```ts
it('evaluates answers and returns follow_up with new questions', async () => {
  // Mock Claude returning:
  // { action: 'follow_up', follow_up_questions: [{ id: 'q1', text: '...' }], domains_affected: [], domain_updates: {} }
  // Mock new round insert

  const result = await evaluateRound(mockSupabase, projectId, 'product', roundId, answers)

  expect(result.action).toBe('follow_up')
  expect(result.followUpRound).toBeDefined()
  expect(result.followUpRound.questions).toHaveLength(1)
})
```

**Domain updates applied on advance:**
```ts
it('applies domain updates to affected domains on advance', async () => {
  // Mock Claude returning advance with domain_updates for 'architecture'
  // Capture the domain update call

  await evaluateRound(mockSupabase, projectId, 'product', roundId, answers)

  expect(updateDomainDataMock).toHaveBeenCalledWith(
    expect.anything(),
    expect.any(String),
    expect.objectContaining({ /* architecture data shape */ })
  )
})
```

**Malformed Claude response — throws:**
```ts
it('throws when Claude returns malformed JSON', async () => {
  // Mock Claude returning invalid JSON
  await expect(
    evaluateRound(mockSupabase, projectId, 'product', roundId, answers)
  ).rejects.toThrow()
})
```

**Round not found — throws:**
```ts
it('throws when round does not exist', async () => {
  // Mock round fetch returning null
  await expect(
    evaluateRound(mockSupabase, projectId, 'product', 'non-existent-id', answers)
  ).rejects.toThrow()
})
```

---

## Step 4 — Run tests

```bash
npm test
```

All 18 previously passing tests must still pass.
New tests must pass.
Record total pass count in ## Assumptions Made.

---

## Step 5 — Verify build

```bash
npm run build
```

---

## What is NOT in this milestone

- checkDomainUnlocks tests (M4a-4d)
- API route tests (M4a-4e)

---

## Assumptions Made

_(Cursor fills this in — audit results and any deviations from test case examples)_

## Open Questions

_(Cursor stops and adds here if ambiguity is unresolvable)_
