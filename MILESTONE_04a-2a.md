# MILESTONE_04a-2a — Layer Restructure: Move /lib/artifacts into /lib/services

## What this milestone does

Moves `/lib/artifacts` into `/lib/services`.
Updates all import paths that reference /lib/artifacts.
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
grep -r "from.*lib/artifacts" --include="*.ts" --include="*.tsx" .
```

Record every affected file in ## Assumptions Made.
Flag any imports found in /components or /app — those are layer violations.
Do not touch any file until audit is complete.

---

## Step 2 — Move files

Move each file in /lib/artifacts to /lib/services:

- `/lib/artifacts/naming.ts` → `/lib/services/artifactNaming.ts`

If additional files exist, move them to /lib/services and record in ## Assumptions Made.
Do not modify function signatures or logic — move only.

---

## Step 3 — Update import paths

Update every file identified in the audit:

```ts
// Before
import { ... } from '@/lib/artifacts/naming'

// After
import { ... } from '@/lib/services/artifactNaming'
```

---

## Step 4 — Fix component layer violations

If any component imports directly from /lib/artifacts (or now /lib/services):
- Purely presentational value (display name, label) → pass as prop instead
- Business logic → move call to API route, component fetches result
- If fix is not clear → stop and add to ## Open Questions

---

## Step 5 — Delete empty folder

Only after build passes:
```bash
rm -rf lib/artifacts
```

---

## Step 6 — Verify

```bash
npm run build
```

Must pass with zero errors. Then smoke test:
- Dashboard loads
- Documents tab shows correct artifact names (MILESTONE_01.md not MILESTONE_XX.md)
- Generate an artifact — naming logic still works

If build fails: do not delete the folder, do not push. Fix and rebuild first.

---

## What is NOT in this milestone

- /lib/documents (M4a-2b)
- /lib/review (M4a-2c)
- Logic changes, component refactoring beyond layer violations, tests

---

## Assumptions Made

### Step 1 — Audit (`grep -r "from.*lib/artifacts"`)

| File | Layer violation? |
|---|---|
| `lib/services/artifactService.ts` | Service — update import path |
| `components/artifacts/DocumentsWorkspace.tsx` | **Yes** — component imported naming logic directly |

No `/app` route files imported `@/lib/artifacts` directly.

Only one file existed under `/lib/artifacts`: `naming.ts`.

### Step 2–3 — Move and import updates

- Moved `lib/artifacts/naming.ts` → `lib/services/artifactNaming.ts` (no logic changes).
- Updated `lib/services/artifactService.ts` to import from `./artifactNaming`.
- Removed re-exports of naming helpers from `artifactService.ts`.

### Step 4 — Component layer violation fix

`DocumentsWorkspace` previously called `canGenerateNextMilestone`, `getMilestoneRowNaming`, etc. directly.

Fix (minimal API extension, naming logic unchanged):
- Added `buildArtifactsWorkspaceUi()` and `getArtifactsWorkspaceForProject()` in `artifactService.ts`.
- `GET /api/artifacts` now returns `{ artifacts, workspace }` where `workspace` carries display names, sequence number, and `canGenerateNextMilestone`.
- `ArtifactsWorkspaceUi` type lives in `lib/types` so the component imports types only, not services.
- `DocumentsWorkspace` reads `workspace` from the API; static defaults use `constants/artifacts.getArtifactFilename` only.

### Step 5 — Cleanup

- Deleted `lib/artifacts/naming.ts` and removed empty `lib/artifacts/` folder after build passed.

## Open Questions

_(Cursor stops and adds here if ambiguity is unresolvable)_
