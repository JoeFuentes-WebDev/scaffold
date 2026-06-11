# MILESTONE_04a-2b — Layer Restructure: Move /lib/documents into /lib/services

## What this milestone does

Moves `/lib/documents` into `/lib/services`.
Updates all import paths that reference /lib/documents.
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
grep -r "from.*lib/documents" --include="*.ts" --include="*.tsx" .
```

Record every affected file in ## Assumptions Made.
Flag any imports found in /components or /app — those are layer violations.
Do not touch any file until audit is complete.

---

## Step 2 — Move files

- `/lib/documents/thresholds.ts` → `/lib/services/domainThresholds.ts`
- `/lib/documents/status.ts` → `/lib/services/domainStatus.ts`

If additional files exist, move them to /lib/services and record in ## Assumptions Made.
Do not modify function signatures or logic — move only.

---

## Step 3 — Update import paths

```ts
// Before
import { ... } from '@/lib/documents/thresholds'
import { ... } from '@/lib/documents/status'

// After
import { ... } from '@/lib/services/domainThresholds'
import { ... } from '@/lib/services/domainStatus'
```

---

## Step 4 — Fix component layer violations

If any component imports directly from /lib/documents (or now /lib/services):
- Purely presentational value → pass as prop instead
- Business logic → move call to API route, component fetches result
- If fix is not clear → stop and add to ## Open Questions

---

## Step 5 — Delete empty folder

Only after build passes:
```bash
rm -rf lib/documents
```

---

## Step 6 — Verify

```bash
npm run build
```

Must pass with zero errors. Then smoke test:
- Documents tab loads with correct artifact states
- Threshold checks work — greyed artifacts show correct missing domains
- Generate an artifact — threshold logic still fires correctly

If build fails: do not delete the folder, do not push. Fix and rebuild first.

---

## What is NOT in this milestone

- /lib/artifacts (M4a-2a — already done)
- /lib/review (M4a-2c)
- Logic changes, component refactoring beyond layer violations, tests

---

## Assumptions Made

### Step 1 — Audit (`grep -r "from.*lib/documents"`)

| File | Layer violation? |
|---|---|
| `lib/services/artifactService.ts` | Service — update import path |
| `lib/services/domainService.ts` | Service — update import path |
| `components/artifacts/DocumentsWorkspace.tsx` | **Yes** — imported threshold helpers directly |
| `components/layout/ProjectShell.tsx` | **Yes** — imported `getDocumentsTabStatus` directly |

No `/app/api` route files imported `@/lib/documents` directly.

Only two files existed under `/lib/documents`: `thresholds.ts`, `status.ts`.

### Step 2–3 — Move and import updates

- Moved `lib/documents/thresholds.ts` → `lib/services/domainThresholds.ts`
- Moved `lib/documents/status.ts` → `lib/services/domainStatus.ts`
- Updated imports in `artifactService.ts` and `domainService.ts`

### Step 4 — Component layer violation fixes

**ProjectShell:** `documentsStatus` is now computed on the server in `app/(app)/projects/[id]/page.tsx` via `getDocumentsTabStatus()` and passed as a prop. Removed direct import from `lib/documents`.

**DocumentsWorkspace:** Removed direct threshold imports. Extended `ArtifactsWorkspaceUi` with `artifactThresholds` (`isReady`, `missingLabel` per artifact type). `getArtifactsWorkspaceForProject()` now loads domains server-side and computes thresholds in `buildArtifactsWorkspaceUi()`. Component reads thresholds from `GET /api/artifacts` workspace payload. Added `refreshKey={documentsStatus}` prop so thresholds reload when domain completion state changes after `router.refresh()`.

Removed `domains` prop from `DocumentsWorkspace` — no longer needed client-side.

### Step 5 — Cleanup

- Deleted `lib/documents/` after build passed.

## Open Questions

_(Cursor stops and adds here if ambiguity is unresolvable)_
