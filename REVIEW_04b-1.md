# REVIEW_04b-1.md

## SECTION 1 — HUMAN SUMMARY

This review covers MILESTONE_04b-1 — technical fixes and must-have V1 completions before M4b-2 UX work. Verify domain auto-completion, review status semantics, env validation at build time, sanitized error handling on review parse, and the dashboard New Project entry point. Confirm the review gate now requires upload/processed status before next-milestone generation (except explicit skip).

---

## SECTION 2 — CURSOR DIRECTIVE

Fill in every field honestly. If something is missing, say so. Do not omit risks or assumptions to appear complete.

---

### 1. Milestone Completed

- **Title:** Technical Fixes and Must-Have V1 Completions
- **Milestone Number:** 04b-1

---

### 2. Files Created

| File Path | Description |
|-----------|-------------|
| `supabase/migrations/003_review_artifact_status.sql` | Migrates existing REVIEW artifacts from `generated` to `template_generated` |
| `app/api/review/complete/route.ts` | Sets REVIEW artifact status to `processed` after gate completion |
| `components/project/DashboardPageClient.tsx` | Client wrapper for dashboard header New Project button + inline form state |

---

### 3. Files Modified

| File Path | What Changed | Why |
|-----------|--------------|-----|
| `lib/services/domainService.ts` | Claude unlock errors return empty result instead of throwing | Fix 1 |
| `app/api/review/parse/route.ts` | try/catch, `project_id`, marks review `uploaded` | Fix 2 + Fix 7 |
| `next.config.ts` | Required env var validation at build time | Fix 3 |
| `lib/prompts/artifacts/onboarding.ts` | Anti-README instruction in system prompt | Fix 4 |
| `lib/prompts/artifacts/milestone.ts` | Anti-README instruction in system prompt | Fix 4 |
| `lib/services/roundService.ts` | Auto-complete domain on `advance`; clarify restores complete | Fix 5 |
| `components/project/DomainWorkspace.tsx` | Mark as complete label, clarify/status/unlock behavior | Fix 5 |
| `components/layout/AppHeader.tsx` | Optional `headerAction` slot | Fix 6 |
| `components/project/DashboardProjectsView.tsx` | Lifted form state to parent; removed duplicate button | Fix 6 |
| `app/(app)/dashboard/page.tsx` | Uses `DashboardPageClient` | Fix 6 |
| `lib/types/index.ts` | REVIEW status values; `canStartReviewGate`; `skippedReview` option | Fix 7 |
| `lib/data/artifacts.ts` | `updateArtifactStatus` helper | Fix 7 |
| `lib/services/artifactNaming.ts` | Review template vs gate-satisfied checks | Fix 7 |
| `lib/services/artifactService.ts` | Review status on generate; mark uploaded/processed; gate logic | Fix 7 |
| `components/artifacts/DocumentsWorkspace.tsx` | Review status UI; complete API before next milestone | Fix 7 |
| `components/artifacts/ReviewGate.tsx` | Passes `project_id` to parse API | Fix 7 |
| `lib/schemas/index.ts` | `project_id` on parse; `CompleteReviewSchema`; `skipped_review` | Fix 7 |
| `app/api/artifacts/generate/route.ts` | Passes `skippedReview` to service | Fix 7 |
| `ONBOARDING.md` | REVIEW status model, auto-complete domains, test path | Fix 7 |
| `__tests__/lib/services/domainService.test.ts` | Malformed JSON returns gracefully | Fix 1 |
| `__tests__/lib/services/roundService.test.ts` | Advance sets domain `complete` | Fix 5 |
| `MILESTONE_04b-1.md` | Assumptions filled in | Milestone protocol |

---

### 4. Assumptions Made

| Area | Assumption Made | Alternative Considered |
|------|-----------------|------------------------|
| Fix 1 | Only Claude/parse failures are swallowed; missing project still throws | Swallow all errors including project not found |
| Fix 4 | No README in repo prompts; added explicit anti-README lines to onboarding/milestone prompts | Search generated artifact output only |
| Fix 6 | New Project in `AppHeader` via client wrapper, secondary variant | Keep button in page body only |
| Fix 7 | Split `canStartReviewGate` (UI) vs `canGenerateNextMilestone` (server) | Single check using `uploaded` only (blocks ReviewGate entry) |
| Fix 7 skip | Skip-review bypasses uploaded/processed server check via `skipped_review` flag | Disallow skip entirely |
| Clarify flow | Service sets in_progress then complete when domain was complete | UI-only status changes |

---

### 5. Open Questions

| # | Question | Impact if Not Resolved |
|---|----------|------------------------|
| 1 | Should skip-review still be allowed now that upload/processed is required? | Skip path bypasses gate semantics; product decision for M4b-2 |
| 2 | Fix 4 not verified by live ONBOARDING generation in this session | README instructions could still appear in Claude output despite prompt guardrails |

---

### 6. Risks

| Risk | Likelihood | What to Check |
|------|------------|---------------|
| Existing REVIEW rows need migration `003` applied in Supabase | High if not pushed | Run `npx supabase db push` before deploy |
| Skip-review generates next milestone without uploaded/processed | Medium | Confirm intentional; test skip path in Documents tab |
| Env validation breaks CI if secrets not configured | Medium | Ensure Vercel has all five required env vars |
| Clarify on complete briefly sets in_progress in UI before refresh | Low | Manual test clarify flow on a complete domain |
| Generated ONBOARDING may still mention README despite prompt fix | Low | Generate ONBOARDING on test project and inspect output |

---

### 7. Layer Violations

> **No layer violations detected.**

Review parse/complete routes delegate to services; UI uses fetch to API routes only.

---

### 8. Engineering Rule Violations

> **No engineering rule violations detected.**

All API routes retain try/catch with `handleRouteError` / `logRouteError`.

---

### 9. Ready to Proceed

- **Ready:** Yes
- **Reasoning:** All seven fixes implemented. 35 tests pass. Build passes with env validation. REVIEW status model, domain auto-complete, and error hardening are in place. Manual smoke test of domain flow and live ONBOARDING generation recommended before M4b-2.
