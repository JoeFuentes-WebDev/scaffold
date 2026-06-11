# MILESTONE_04a-3 — Inline Function Cleanup

## What this milestone does

Removes inline functions from all components and pages.
Every handler, callback, and helper declared inline gets extracted to a named external function.
No logic changes. Extraction only.

## Ambiguity protocol

If you encounter a decision not covered here:
- If a safe assumption exists, make it, record it under ## Assumptions Made, and continue
- If no safe assumption exists, stop and add the question to ## Open Questions — do not guess

---

## Architectural invariants — enforced in this milestone

- No inline functions anywhere in components or pages
- All event handlers declared as named functions above the return statement or in a separate file
- No anonymous arrow functions passed as props: `onClick={() => ...}` is a violation
- Exception: simple one-liner prop passthrough where extracting adds no clarity — record in Assumptions

---

## What counts as a violation

```tsx
// VIOLATION — inline arrow function
<button onClick={() => setOpen(true)}>Open</button>

// VIOLATION — inline handler with logic
<input onChange={(e) => {
  setValue(e.target.value)
  validate(e.target.value)
}} />

// VIOLATION — inline map with logic
{items.map((item) => (
  <div key={item.id} onClick={() => handleSelect(item.id)}>
    {item.name}
  </div>
))}

// CORRECT — named external function
function handleOpen() {
  setOpen(true)
}
<button onClick={handleOpen}>Open</button>

// CORRECT — named handler
function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
  setValue(e.target.value)
  validate(e.target.value)
}
<input onChange={handleInputChange} />
```

---

## Step 1 — Audit

Before touching any file, run these two commands:

**Event handler inline functions (onClick, onChange, onSubmit, etc.):**
```bash
grep -rn "on[A-Z][a-zA-Z]*={(" components/ app/ --include="*.tsx"
```

**All other inline arrow functions passed as props or in JSX:**
```bash
grep -rn "={[^}]*=>" components/ app/ --include="*.tsx"
```

Record the full output and total line count in ## Assumptions Made. This is the baseline. After cleanup, re-running these commands should return 0 lines (or near 0 for documented exceptions). Do not start Step 2 until the audit is recorded.

---

## Step 2 — Fix component by component

Work through components one file at a time. For each file:

1. Identify all inline functions
2. Extract each to a named function declared above the return statement
3. Name functions descriptively — `handleSubmitAnswers` not `handleClick`
4. If the function needs access to state or props, keep it inside the component but above the return
5. If the function has no dependencies on component state, move it outside the component entirely

Do not batch multiple files in one pass. One file at a time, confirm no regressions before moving to the next.

---

## Step 3 — Priority order

Fix in this order — highest violation density first (adjust based on audit findings):

1. `/components/project/QuestionRound.tsx`
2. `/components/artifacts/DocumentsWorkspace.tsx`
3. `/components/artifacts/ReviewGate.tsx`
4. `/components/project/DomainWorkspace.tsx`
5. `/components/layout/` — all files
6. All remaining components
7. `/app/` pages

---

## Step 4 — Verify after each file

After fixing each file:
```bash
npm run build
```

If build fails after a single file change — revert that file, record what failed in ## Open Questions, and move to the next file. Do not let one file block the entire milestone.

---

## Step 5 — Final audit

After all files are fixed, re-run the audit commands from Step 1. Count should be 0 or near 0. Any remaining inline functions must be documented as accepted exceptions in ## Assumptions Made with justification.

---

## Step 6 — Verify

```bash
npm run build
```

Must pass. Then smoke test:
- Create project flow works
- Questionnaire generates and submits correctly
- Documents tab loads and generates artifact

---

## What is NOT in this milestone

- Logic changes
- Component restructuring beyond extracting inline functions
- Tests (M4a-4)
- New features

---

## Assumptions Made

### Step 1 — Audit baseline

**Event handler inline functions (`on[A-Z]*={(`):** 2 matches
- `components/artifacts/DocumentsWorkspace.tsx:366` — `onDownload={() => handleDownload(artifactType)}`
- `components/artifacts/DocumentsWorkspace.tsx:369` — `onToggleExpand={() => handleToggleExpand(artifactType)}`

**Other inline arrow props (`={...=>`):** 2 matches (same lines as above)

Additional inline patterns found during file-by-file review (not caught by prop-only grep):
- `getGenerateHandler` / `getRegenerateHandler` factory functions returning anonymous handlers in `DocumentsWorkspace`
- `useEffect(() => ...)` / `reader.onload = () => ...` callbacks in multiple components
- `useState(() => ...)` lazy initializers in `QuestionRound`
- `setState((previous) => ...)` updaters in `QuestionRound`, `ReviewGate`, `ColdStartForm`
- `.map((item) => ...)` JSX/list callbacks across `DocumentsWorkspace`, `ColdStartForm`, `ProjectList`, `DomainWorkspace`, `AnsweredRoundSummary`, `DomainSidebar`
- `handleSeedAnswerChange` curried factory in `ColdStartForm`

### Step 2–3 — Fixes applied (priority order)

1. `QuestionRound.tsx` — named state init/sync, setState updaters, `renderQuestion`, submit payload mapper
2. `DocumentsWorkspace.tsx` — per-row named handlers, `renderDefinitionRow`, `refreshArtifacts`, `isGeneratedArtifact`
3. `ReviewGate.tsx` — `handleReaderLoad`, named map helpers, `renderManualStep`, setState updater
4. `DomainWorkspace.tsx` — `syncDomainRounds`, `renderAnsweredRound`, `isAnsweredRound`
5. `ProjectShell.tsx` — `syncInitialProjectState`
6. `ColdStartForm.tsx` — extracted `SeedQuestionField.tsx`, `renderSeedQuestion`, named setState updater
7. `AnsweredRoundSummary.tsx`, `ProjectList.tsx`, `DomainSidebar.tsx` — named render/map helpers

### Step 5 — Final audit

Re-ran Step 1 grep commands: **0 matches** in `components/` and `app/`.

**Accepted exceptions:** Module-level data helpers (e.g. `artifacts.find(...)`, `domains.find(...)`) retain arrow callbacks inside pure utility functions outside JSX — not passed as component props and not event handlers.

## Open Questions

_(Cursor stops and adds here if ambiguity is unresolvable)_
