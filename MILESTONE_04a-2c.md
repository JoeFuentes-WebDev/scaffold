# MILESTONE_04a-2c — Layer Restructure: Move /lib/review into /lib/services

## What this milestone does

Moves `/lib/review` into `/lib/services`.
Updates all import paths that reference /lib/review.
No logic changes. Move only.

## Ambiguity protocol

If you encounter a decision not covered here:
- If a safe assumption exists, make it, record it under ## Assumptions Made, and continue
- If no safe assumption exists, stop and add the question to ## Open Questions — do not guess

---

## Architectural invariants — enforced in this milestone

- Components never import directly from /lib/services, /lib/artifacts, /lib/documents, or /lib/review
- Components call API routes via fetch only
- Business logic lives in /lib/services only

---

## Step 1 — Audit (do this before touching any files)

```bash
grep -r "from.*lib/review" --include="*.ts" --include="*.tsx" .
```

Record every affected file in ## Assumptions Made.
Flag any imports found in /components or /app — those are layer violations.
Do not touch any file until audit is complete.

---

## Step 2 — Move files

- `/lib/review/parseReviewMarkdown.ts` → `/lib/services/reviewParser.ts`

If additional files exist, move them to /lib/services and record in ## Assumptions Made.
Do not modify function signatures or logic — move only.

---

## Step 3 — Update import paths

```ts
// Before
import { ... } from '@/lib/review/parseReviewMarkdown'

// After
import { ... } from '@/lib/services/reviewParser'
```

---

## Step 4 — Fix component layer violations

If any component imports directly from /lib/review (or now /lib/services):
- Purely presentational value → pass as prop instead
- Business logic → move call to API route, component fetches result
- If fix is not clear → stop and add to ## Open Questions

---

## Step 5 — Delete empty folder

Only after build passes:
```bash
rm -rf lib/review
```

---

## Step 6 — Verify

```bash
npm run build
```

Must pass with zero errors. Then smoke test:
- Review gate works — upload a review file, open questions surface correctly
- Manual steps checklist renders correctly

If build fails: do not delete the folder, do not push. Fix and rebuild first.

---

## What is NOT in this milestone

- /lib/artifacts (M4a-2a — already done)
- /lib/documents (M4a-2b — already done)
- Logic changes, component refactoring beyond layer violations, tests

---

## Assumptions Made

_(Cursor fills this in — audit results go here)_

## Open Questions

_(Cursor stops and adds here if ambiguity is unresolvable)_
