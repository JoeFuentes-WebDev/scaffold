# MILESTONE_04a-5 — Sanitize 500 Error Responses Across All API Routes

## What this milestone does

Creates a shared `handleRouteError` utility.
Replaces all catch blocks in API routes with the shared helper.
Internal error messages never reach the client.
Real errors logged server-side only.

## Ambiguity protocol

If you encounter a decision not covered here:
- If a safe assumption exists, make it, record it under ## Assumptions Made, and continue
- If no safe assumption exists, stop and add the question to ## Open Questions — do not guess

---

## Architectural invariants — enforced in this milestone

- No internal error message ever returned to the client in a 500 response
- All 500 errors logged server-side with route context before returning
- One shared helper used across all routes — no per-route catch block variations

---

## Step 1 — Create the helper

Create `/lib/utils/routeError.ts`:

```ts
import { NextResponse } from 'next/server'

export function handleRouteError(
  error: unknown,
  context: string,
  fallbackMessage: string
): NextResponse {
  console.error(`[${context}]`, error)
  return NextResponse.json({ error: fallbackMessage }, { status: 500 })
}
```

---

## Step 2 — Audit all API routes

Run:
```bash
find app/api -name "route.ts" | sort
```

List every route file in ## Assumptions Made before making any changes.

---

## Step 3 — Update all catch blocks

For every route file, replace the existing catch block pattern with `handleRouteError`.

Before:
```ts
} catch (error) {
  const message = error instanceof Error ? error.message : "Failed to create project"
  return NextResponse.json({ error: message }, { status: 500 })
}
```

After:
```ts
} catch (error) {
  return handleRouteError(error, 'POST /api/projects', 'Failed to create project. Please try again.')
}
```

Rules for the fallback message:
- User-readable — describes what failed in plain language
- Actionable — ends with "Please try again." where appropriate
- Never includes: table names, field names, constraint names, stack traces, or internal service names

---

## Step 4 — Update the 500 test

Update `__tests__/app/api/projects.test.ts` — the 500 test should now assert that the internal error message is NOT in the response:

```ts
it('returns 500 without exposing internal error message', async () => {
  createProject.mockRejectedValue(new Error('DB connection failed'))

  const response = await POST(request)
  const body = await response.json()

  expect(response.status).toBe(500)
  expect(body.error).not.toContain('DB connection failed')
  expect(body.error).toMatch(/please try again/i)
})
```

---

## Step 5 — Run tests

```bash
npm test
```

All 35 previously passing tests must still pass.
The updated 500 test must pass.
Record total pass count in ## Assumptions Made.

---

## Step 6 — Verify build

```bash
npm run build
```

---

## Step 7 — Smoke test

Run `npm run dev` and confirm:
- Normal flows still work (create project, generate round, generate artifact)
- No 500 responses on happy paths

---

## What is NOT in this milestone

- Changes to 400 error responses (those are Zod validation errors, already correct)
- Auth error responses (those are intentional 401s)
- Logging infrastructure beyond console.error (V2)

---

## Assumptions Made

### Route files audited (13 total)

```
app/api/artifacts/generate/route.ts
app/api/artifacts/route.ts
app/api/domains/[id]/status/route.ts
app/api/domains/check-unlocks/route.ts
app/api/projects/[id]/regenerate-pending/route.ts
app/api/projects/[id]/route.ts
app/api/projects/route.ts
app/api/review/parse/route.ts
app/api/rounds/clarify/route.ts
app/api/rounds/evaluate/route.ts
app/api/rounds/generate/route.ts
app/api/rounds/regenerate/route.ts
app/api/rounds/route.ts
```

- **12 routes updated** with `handleRouteError` (all routes with JSON catch blocks).
- **`app/api/review/parse/route.ts`** — no catch block (pure sync parse, no service errors).
- **`app/api/artifacts/generate/route.ts`** — streaming route uses `logRouteError` + generic `controller.error` message (cannot return `NextResponse` from stream handler). `logRouteError` extracted from the same module as `handleRouteError` for shared server-side logging.

### Test results

- **35 passed**, 0 failed. Updated 500 test asserts internal message is not exposed and fallback includes "Please try again."
- `npm run build` passes.

### Smoke test

- Existing dev server on port 3000: `GET /login` → 200, `POST /api/projects` (unauthenticated) → 401 (not 500).

## Open Questions

_(Cursor stops and adds here if ambiguity is unresolvable)_
