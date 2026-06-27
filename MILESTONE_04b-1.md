# MILESTONE_04b-1 — Technical Fixes and Must-Have V1 Completions

## What this milestone does

Fixes 6 technical issues before M4b-2 UX work begins.
No new features. Fixes and hardening only.

## Ambiguity protocol

If you encounter a decision not covered here:
- If a safe assumption exists, make it, record it under ## Assumptions Made, and continue
- If no safe assumption exists, stop and add the question to ## Open Questions — do not guess

---

## Architectural invariants — enforced in this milestone

- Every API route must have a top-level try/catch using handleRouteError
- No silent failures — errors must be logged server-side
- Domain status transitions must be consistent and predictable

---

## Fix 1 — checkDomainUnlocks try/catch

**File:** `lib/services/domainService.ts`

**Problem:** `checkDomainUnlocks` throws when Claude returns malformed JSON. This crashes the unlock check silently — domains stay locked, no error shown to user.

**Fix:** Wrap the Claude call in try/catch. On malformed response or any error, log server-side and return without throwing. Unlock check failure must never crash the app.

```ts
try {
  // Claude call and domain unlock logic
} catch (error) {
  console.error('[checkDomainUnlocks]', error)
  return // silent recovery — no throw
}
```

---

## Fix 2 — /api/review/parse catch block

**File:** `app/api/review/parse/route.ts`

**Problem:** No catch block. If the markdown parser throws on a malformed upload, route returns an unhandled 500.

**Fix:** Add top-level try/catch using `handleRouteError`:

```ts
} catch (error) {
  return handleRouteError(error, 'POST /api/review/parse', 'Failed to parse review file. Please try again.')
}
```

---

## Fix 3 — Pre-deploy env validation

**File:** `next.config.ts`

**Problem:** Missing env vars cause a broken deploy with a cryptic runtime error instead of a clear build-time failure.

**Fix:** Add required env var check at the top of next.config.ts:

```ts
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ANTHROPIC_API_KEY',
  'NEXT_PUBLIC_APP_URL',
]

requiredEnvVars.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
})
```

Note: `NEXT_PUBLIC_` vars are available at build time. This check runs during `next build` on Vercel.

---

## Fix 4 — README regeneration bug

**Problem:** Something in the artifact generation flow is repeatedly prompting for README updates. Locate the source — likely in one of the artifact prompts or in ONBOARDING.md content that Cursor is interpreting as an instruction to update README.

**Step 1 — Audit:** Search all prompt builder files in `/lib/prompts/artifacts/` for any reference to README. Also check if ONBOARDING.md content includes README update instructions.

```bash
grep -rn "README" lib/prompts/ --include="*.ts"
grep -n "README" ONBOARDING.md
```

**Step 2 — Fix:** Remove or qualify any README references found. If ONBOARDING.md contains README update instructions, remove them — ONBOARDING.md should not instruct Cursor to update other files outside the milestone scope.

**Step 3 — Verify:** Generate ONBOARDING.md on a test project and confirm no README instructions appear in the output.

---

## Fix 5 — Auto-complete domains, smarter Stop Here

**Files:** `components/project/DomainWorkspace.tsx`, API route for domain status, `/lib/services/domainService.ts`

**Problem:** Domains require manual "Stop Here" toggle to reach complete status even when Claude has returned `advance` with no follow-up questions. Stop Here is doing two jobs — completing domains AND cutting them off early.

**Fix:**

When `evaluateRound` returns `action: 'advance'` and no follow-up round is created:
- Automatically set domain status to `complete`
- Do not require Stop Here

Stop Here becomes an override only:
- Visible when domain is `in_progress`
- Clicking sets status to `complete` immediately
- Label: "Mark as complete" (clearer than "Stop Here")
- Unchecking reopens domain to `in_progress`

"I need to clarify something" behavior:
- Clicking changes domain status from `complete` to `in_progress`
- After clarification is submitted, domain returns to `complete` automatically
- No manual Stop Here needed after clarification

---

## Fix 6 — New Project button in dashboard header

**Files:** `components/layout/ProjectShell.tsx` or dashboard header component, `/app/(app)/dashboard/page.tsx`

**Problem:** No way to create a new project from within the app once a project exists. User must navigate to /dashboard manually.

**Fix:**
- Add "New Project" button to the dashboard header (top right)
- Clicking navigates to `/dashboard` or opens the cold start form inline
- Button only visible on the dashboard project list view — not inside a project workspace
- Style: secondary button, not primary — doesn't compete with project actions

---

## Fix 7 — REVIEW artifact status values

**Files:** `lib/services/artifactService.ts`, `lib/data/artifacts.ts`, `lib/services/domainStatus.ts`, `lib/services/artifactNaming.ts`, any UI components that check REVIEW status

**Problem:** REVIEW artifact status `generated` conflates two different states — Scaffold created the template vs the developer uploaded a filled version. The gate currently checks `status = generated` to unlock the next milestone, but that only means the template was created, not that it was filled and uploaded.

**Fix:** Update REVIEW artifact status to use three distinct values:

- `template_generated` — Scaffold created the blank template (replaces `generated` for REVIEW type only)
- `uploaded` — developer uploaded a filled version back to Scaffold
- `processed` — Scaffold ran the gate (open questions answered, manual steps checked)

For all other artifact types (onboarding, milestone, env_manifest), `generated` stays as-is.

Update the milestone sequence gate check:
```ts
// Before
status === 'generated'

// After (for REVIEW artifacts only)
status === 'uploaded' || status === 'processed'
```

Update the POST /api/review/parse route to set REVIEW status to `uploaded` after successful parse.

Update the gate completion step to set REVIEW status to `processed` after open questions are answered and manual steps confirmed.

Update ONBOARDING.md after this fix to reflect accurate status terminology.

**DB migration required:**
```sql
-- Update existing REVIEW artifacts from 'generated' to 'template_generated'
UPDATE artifacts 
SET status = 'template_generated' 
WHERE artifact_type = 'review' AND status = 'generated';
```

Add this as a new migration file in `/supabase/migrations/`.

---

## Step — Run tests after all fixes

```bash
npm test
```

All 35 previously passing tests must still pass.
If any fix breaks existing tests, fix the test or the implementation before committing.

---

## Step — Verify build

```bash
npm run build
```

Must pass. Note: Fix 3 (env validation) will cause build to fail locally if .env.local is missing vars. Confirm your .env.local is complete before running build.

---

## Step — Smoke test

Run `npm run dev` and confirm:
- Domain auto-completes after Claude returns advance (no Stop Here needed)
- Stop Here still works as manual override
- Clarify button on complete domain sets it to in_progress, returns to complete after submit
- New Project button visible on dashboard
- README prompt no longer appears in generated ONBOARDING.md

---

## What is NOT in this milestone

- UX updates 1, 2, 4 (M4b-2)
- Decision Support Mode (M4b-2)
- Configurable model per artifact type (M4b-2)
- REVIEW template format audit (M4b-2)
- Any new features

---

## Assumptions Made

- **Fix 1:** Claude/parse failures return `{ unlocked_domains: [], documents_status }` using pre-unlock domain list; `Project not found` still throws.
- **Fix 4:** No README references in prompt files or checked-in `ONBOARDING.md`; added explicit anti-README instructions to onboarding and milestone system prompts.
- **Fix 6:** New Project button lives in `AppHeader` via `DashboardPageClient` (secondary variant); form state lifted to client wrapper.
- **Fix 7:** Split gate checks — `canStartReviewGate` (UI, requires `template_generated`) vs `canGenerateNextMilestone` (server, requires `uploaded`/`processed`); skip-review path bypasses uploaded/processed requirement; added `POST /api/review/complete`; parse schema now requires `project_id`.
- **Tests:** 35 passed. Build passes with complete `.env.local`.

## Open Questions

_(Cursor stops and adds here if ambiguity is unresolvable)_
