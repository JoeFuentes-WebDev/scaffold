# REVIEW_04b-2.md

## SECTION 1 — HUMAN SUMMARY

This review covers Milestone 4b-2 of Scaffold V1 — seven UX and product features: auto-generate REVIEW with MILESTONE, cleaner progression flow, clippable questions, clarification acknowledgment, Decision Support Mode, configurable model per artifact type, and REVIEW template format fix. Read through files created and modified, check open questions for anything needing your decision, and verify the smoke test results before proceeding to the next milestone. A passing review means all seven features work end-to-end, no regressions in 35 existing tests, and the REVIEW template now uses numbered lists that the parser can extract correctly.

---

## SECTION 2 — CURSOR DIRECTIVE

Fill in every field honestly. If something is missing, say so. Do not omit risks or assumptions to appear complete.

---

### 1. Milestone Completed

- **Title:** UX and Product Features
- **Milestone Number:** 04b-2

---

### 2. Files Created

List every file created. One-line description of what it does.

| File Path | Description |
|-----------|-------------|
| `lib/config/models.ts` | Maps artifact types to Claude model IDs with `getModelForArtifact()` helper |
| `app/api/rounds/clarify-ack/route.ts` | POST endpoint that returns a one-line Claude acknowledgment for a clarification |
| `app/api/rounds/suggest-options/route.ts` | POST endpoint that returns 2–3 JSON answer options with tradeoffs for a question |

---

### 3. Files Modified

List every file that was changed. Include what changed and why.

| File Path | What Changed | Why |
|-----------|--------------|-----|
| `lib/claude/client.ts` | `callClaude` and `streamClaude` accept optional `model` param | Feature 6 — per-artifact model selection |
| `lib/config/models.ts` | (created) | Feature 6 |
| `lib/prompts/artifacts/review.ts` | Open Questions / Manual Steps use numbered lists; explicit no-tables instruction | Feature 7 |
| `lib/services/reviewParser.ts` | Supports `### N.` section headers; stops at next `##` or `###` | Feature 7 |
| `lib/services/artifactService.ts` | Auto-calls `generateReviewTemplate` after milestone save; uses `getModelForArtifact` | Features 1 and 6 |
| `lib/services/roundService.ts` | Added `generateClarificationAck` and `suggestAnswerOptions` | Features 4 and 5 |
| `lib/schemas/index.ts` | Added `ClarifyAckSchema` and `SuggestOptionsSchema` | Features 4 and 5 |
| `lib/types/index.ts` | Added `SuggestOption` interface | Avoid components importing from services |
| `components/artifacts/ArtifactRow.tsx` | Added `secondaryLabel`, `isExpandable`, `showGenerateButton` props | Feature 1 REVIEW row UX |
| `components/artifacts/DocumentsWorkspace.tsx` | Three-step Continue → Upload → Generate flow; REVIEW template label and expand rules | Features 1 and 2 |
| `components/artifacts/ReviewGate.tsx` | Added `hideUploadStep`, `initialParsedReview`, `initialSkippedReview` | Feature 2 — gate-only steps |
| `components/project/QuestionItem.tsx` | Clipboard icon, suggest-options cards, "Use this" fill | Features 3 and 5 |
| `components/project/QuestionRound.tsx` | Copy all questions, suggest-options API wiring | Features 3 and 5 |
| `components/project/DomainWorkspace.tsx` | Clarify-ack callout with 4s auto-dismiss; passes project/domain to QuestionRound | Feature 4 |
| `__tests__/lib/services/reviewParser.test.ts` | Two tests for `### 5.` / `### 6.` numbered list sections | Feature 7 |

---

### 4. Assumptions Made

List every decision made where the milestone instructions were ambiguous or silent. If none, write `None`.

| Area | Assumption Made | Alternative Considered |
|------|-----------------|------------------------|
| Feature 1 UI refresh | Reload artifacts after milestone stream instead of returning review ID in generate response | Extend streaming API to emit review artifact metadata |
| Feature 2 upload location | Upload section in `DocumentsWorkspace`, not inside `ReviewGate` | Keep upload inside gate with hidden first step |
| Feature 5 scope | Suggest-options only in domain questionnaire (`DomainWorkspace`), not review-gate open questions | Pass projectId into ReviewGate QuestionRound |
| Feature 6 model IDs | Used exact strings from milestone spec (`claude-opus-4-6`, `claude-sonnet-4-6`) | Verify against live Anthropic model catalog |

---

### 5. Open Questions

Anything unresolved that the developer must decide before or during the next milestone.

> **No open questions.**

---

### 6. Manual Steps Required

Steps the developer must perform manually before the next milestone begins.

1. **Run smoke tests in the live app** — Why: Claude-dependent flows (auto REVIEW, clarify-ack, suggest-options, Opus onboarding) were not exercised end-to-end in this session.
2. **Confirm Anthropic model IDs resolve in production** — Why: `claude-opus-4-6` / `claude-sonnet-4-6` were configured per spec but not verified against Vercel/runtime logs here.

---

### 7. Risks

Anything that could break silently, requires manual verification, or has edge cases not yet handled.

| Risk | Likelihood | What to Check |
|------|------------|---------------|
| Opus model ID invalid or unavailable | Medium | Generate ONBOARDING; confirm no API error and correct model in logs |
| Suggest-options JSON parse failures | Low | Click "I'm not sure" on several domain questions; confirm cards render |
| REVIEW row not visible until artifact reload | Low | Generate MILESTONE; confirm REVIEW row appears with template label without page refresh |
| Clipboard API blocked (non-HTTPS) | Low | Test copy icon locally on http vs https |
| Skip-review path bypasses uploaded status server check | Low | Skip upload, complete gate, generate next milestone — should succeed via `skipped_review` flag |

---

### 8. Layer Violations

Any place where UI, service, and data layers were combined or bypassed. Should be none.

> **No layer violations detected.**

---

### 9. Engineering Rule Violations

Any rule from the engineering standards that was bent or broken. Should be none.

> **No engineering rule violations detected.**

---

### 10. Feature Smoke Test Results

Confirm each feature was manually tested:

| Feature | Tested | Result | Notes |
|---------|--------|--------|-------|
| REVIEW auto-generates with MILESTONE | No | Not verified live | Implemented in `artifactService.streamArtifactGeneration`; requires Claude API |
| Three-step progression flow (Continue → Upload → Generate) | No | Not verified live | UI implemented in `DocumentsWorkspace` |
| Clipboard icon copies individual question | No | Not verified live | Uses `navigator.clipboard.writeText` |
| Copy all questions copies numbered list | No | Not verified live | Implemented in `QuestionRound` |
| Clarification acknowledgment appears after submit | No | Not verified live | `/api/rounds/clarify-ack` + callout in `DomainWorkspace` |
| Decision Support Mode shows options with tradeoffs | No | Not verified live | `/api/rounds/suggest-options` + cards in `QuestionItem` |
| ONBOARDING uses Opus model (check logs) | No | Not verified live | `getModelForArtifact("onboarding")` returns Opus |
| REVIEW template uses numbered lists not tables | Partial | Prompt updated | Template generation not re-run in this session |
| Parser extracts open questions from numbered list format | Yes | Pass | 2 new unit tests pass |

---

### 11. Test Results

- **Tests passing before milestone:** 35
- **Tests passing after milestone:** 37
- **New tests added:** 2 (`reviewParser.test.ts` — numbered `### 5.` / `### 6.` sections)
- **Any test failures:** None

---

### 12. Ready to Proceed

- **Ready:** Yes (with manual smoke verification)
- **Reasoning:** All seven features are implemented, automated tests pass (37/37), and production build succeeds. Claude-dependent flows and Opus model usage should be smoke-tested in the running app before treating the milestone as fully validated end-to-end.
