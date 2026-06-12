# MILESTONE_04a-4d — Tests: checkDomainUnlocks Service

## What this milestone does

Adds tests for `checkDomainUnlocks` in `lib/services/domainService.ts`.
Requires mocking Supabase and Anthropic clients.
No real DB calls. No real API calls.

## Ambiguity protocol

If you encounter a decision not covered here:
- If a safe assumption exists, make it, record it under ## Assumptions Made, and continue
- If no safe assumption exists, stop and add the question to ## Open Questions — do not guess

---

## Architectural invariants — enforced in this milestone

- Tests never call real Supabase or Anthropic APIs
- Mock shapes must match what M4a-4b and 4c established
- Each test is independent — no shared state between tests

---

## Step 1 — Audit checkDomainUnlocks

Before writing any tests, read `lib/services/domainService.ts` and document:
- What arguments does `checkDomainUnlocks` accept?
- What Supabase queries does it make?
- What does it send to Claude?
- What does Claude return?
- What domain status updates does it apply?
- What does it return?
- What does it throw on failure?

Record in ## Assumptions Made before writing any test.

---

## Step 2 — Create test file

Create `/__tests__/lib/services/domainService.test.ts`

Reuse the same mock patterns established in M4a-4b and 4c.

---

## Step 3 — Test cases

**Happy path — Claude unlocks one domain:**
```ts
it('unlocks domains Claude identifies as having enough context', async () => {
  // Mock all domains fetch returning:
  // [{ name: 'scope', status: 'locked' }, { name: 'users', status: 'locked' }, ...]
  // Mock Claude returning: ['scope']
  // Expect updateDomainStatus called with 'scope' and 'available'
  // Expect updateDomainStatus NOT called for 'users'

  await checkDomainUnlocks(mockSupabase, projectId)

  expect(updateDomainStatusMock).toHaveBeenCalledWith(
    expect.anything(),
    expect.any(String),
    'available'
  )
})
```

**No locked domains — Claude not called:**
```ts
it('does not call Claude when no locked domains exist', async () => {
  // Mock all domains returning no locked domains
  // Expect Claude NOT called

  await checkDomainUnlocks(mockSupabase, projectId)

  expect(claudeMock).not.toHaveBeenCalled()
})
```

**Claude returns empty array — no domains unlocked:**
```ts
it('unlocks nothing when Claude returns empty array', async () => {
  // Mock locked domains existing
  // Mock Claude returning: []
  // Expect updateDomainStatus never called

  await checkDomainUnlocks(mockSupabase, projectId)

  expect(updateDomainStatusMock).not.toHaveBeenCalled()
})
```

**Claude returns malformed response — does not throw, logs error:**
```ts
it('handles malformed Claude response gracefully without throwing', async () => {
  // Mock Claude returning invalid JSON
  // Expect function to complete without throwing
  // Expect no domain status updates

  await expect(
    checkDomainUnlocks(mockSupabase, projectId)
  ).resolves.not.toThrow()
})
```

**Only unlocks domains that are currently locked:**
```ts
it('does not unlock domains that are already available or in_progress', async () => {
  // Mock domains: scope=locked, users=available, architecture=in_progress
  // Mock Claude returning: ['scope', 'users', 'architecture']
  // Expect updateDomainStatus called only for 'scope'
  // Not called for 'users' or 'architecture' (already past locked)

  await checkDomainUnlocks(mockSupabase, projectId)

  expect(updateDomainStatusMock).toHaveBeenCalledTimes(1)
})
```

---

## Step 4 — Run tests

```bash
npm test
```

All 23 previously passing tests must still pass.
New tests must pass.
Record total pass count in ## Assumptions Made.

---

## Step 5 — Verify build

```bash
npm run build
```

---

## What is NOT in this milestone

- API route tests (M4a-4e)

---

## Assumptions Made

### checkDomainUnlocks audit

- **Arguments:** `(projectId: string)` only — creates Supabase via `createClient()` internally (not `(supabase, projectId)` as milestone examples show).
- **Flow:**
  1. `getProjectById` — throws `"Project not found"` if null
  2. `getDomainsForProject` — filters `status === "locked"`; early return (no Claude) if none
  3. `getRoundsForProject` — prompt context
  4. `callClaude` — check-unlocks prompt
  5. `parseClaudeJson<CheckUnlocksResponse>` — expects `{ domains_to_unlock: string[] }` (not a bare array)
  6. For each name in `domains_to_unlock`: validate name, `getDomainByName`, skip if not `locked`, else `unlockDomain`
  7. `getDomainsForProject` again — refresh for `documents_status`
  8. Returns `{ unlocked_domains: DomainName[], documents_status: DomainStatus }`
- **Throws:** `"Project not found"`, Claude API error, malformed JSON (both wrapped as `"Something went wrong checking domain unlocks. Please try again."`)

### Deviations from milestone examples

- **Signature:** Tests call `checkDomainUnlocks(projectId)`; mock `@/lib/supabase/server` `createClient` instead of passing supabase.
- **Claude response:** `{ domains_to_unlock: ["scope"] }`, not `["scope"]`.
- **Unlock mechanism:** Service calls `unlockDomain`, not `updateDomainStatus` directly — tests assert on `unlockDomain`.
- **Malformed JSON:** Milestone says graceful no-throw; actual code **throws** — test expects rejection.

### Test results

- **28 passed**, 0 failed (5 test files: 23 from M4a-4a/4b/4c + 5 new). `npm run build` passes.

## Open Questions

_(Cursor stops and adds here if ambiguity is unresolvable)_
