# MILESTONE_02.1 — Patch: Bugs and UX Fixes from Live Testing

## What this milestone fixes

Issues found during live testing of M2 on the Scaffold project itself.

## Ambiguity protocol

If you encounter a decision not covered here:
- If a safe assumption exists, make it, record it under ## Assumptions Made, and continue
- If no safe assumption exists, stop and add the question to ## Open Questions — do not guess

---

## Bug 1 — Domain unlock logic not firing

**What happens:** Completing domains and marking them Stop Here does not unlock downstream locked domains (Scope, Domain Model, Engineering Rules, Deployment).

**Root cause:** The `evaluateAnswers` prompt is too conservative about listing `domains_affected`. Domains that have enough context to unlock are not being surfaced.

**Fix 1 — Prompt:**
In `/lib/prompts/evaluateAnswers.ts`, add to the system prompt:

> "Be aggressive about listing domains_affected. If an answer touches deployment, engineering rules, domain model, scope, or any other domain even tangentially, include it. It is always better to unlock a domain early than to leave it locked when relevant context exists."

**Fix 2 — Unlock trigger:**
The unlock check must fire after every domain status change, not just after Stop Here on Documents. 

In `domainService`, the `checkDocumentsUnlock` function should be renamed `checkDomainUnlocks` and expanded:
- After any domain is marked `complete`, iterate all `locked` domains
- For each locked domain, check if any existing round across any domain contains answers that touch that domain's subject area
- If yes, set status to `available`

This check should be a separate Claude call:
```
POST /api/domains/check-unlocks
{ project_id }
```

Prompt: send full ProjectModel, ask Claude to return a list of domain names that have enough context to unlock. Set those domains to `available`.

Call this endpoint after every Stop Here toggle.

---

## Bug 2 — No way to edit project description after creation

**What happens:** Once a project is created, the description is locked. If the seed description is vague or wrong, all downstream questions are affected.

**Fix:**
- Add an edit icon (pencil) next to the project description in the header
- Clicking opens an inline edit field
- On save: PATCH `/api/projects/[id]` with updated description
- After save: if any rounds exist in `pending` state, prompt user: "Your description changed. Regenerate questions for active domains?" Yes/No.
- If Yes: delete pending rounds and call `/api/rounds/generate` again for those domains

---

## Bug 3 — No way to restart or discard a pending round

**What happens:** Once questions generate, there is no way to back out and regenerate with different context.

**Fix:**
- Add a "Regenerate questions" button on the QuestionRound component (only visible when round status is `pending` — i.e. not yet answered)
- On click: confirm dialog "This will discard the current questions and generate new ones."
- On confirm: delete the pending round row, call `/api/rounds/generate` again
- Do not show this button on answered rounds

---

## Bug 4 — Answered rounds not expandable

**What happens:** Previous rounds show as "Round 1 — Answered" but are not clickable or expandable. No way to review what was answered.

**Fix:**
- Make answered round rows clickable
- Expand to show Q&A in read-only format
- Each question and its answer displayed clearly
- Collapse on second click
- No editing — read-only only at V1

---

## UX Fix 5 — "I need to clarify" button

**What happens:** No way to correct or add context to a past answer without going through a new round.

**Fix:**
- Add "I need to clarify something" button at the bottom of DomainWorkspace when domain is `in_progress` or `complete`
- Clicking opens a single free-text textarea: "What would you like to clarify?"
- On submit: creates a new round in the same domain with the clarification as a special `clarification` type
- The clarification round is included in all future prompt context with a label: "Developer clarification on previous answer:"
- This round does not generate follow-up questions — it's a one-way correction, not a new Q&A cycle

---

## UX Fix 6 — Cold start description hint

**What happens:** Vague descriptions produce broad, off-target questions.

**Fix:**
- Add helper text below the description textarea in cold start:
  > "The more specific you are, the sharper the first questions will be. Include what the app does, who it's for, and any key technical decisions you've already made."

---

## UX Fix 7 — N/A checkbox per question

**What happens:** All questions must be answered before Submit enables. No way to skip an irrelevant question.

**Fix:**
- Add an N/A checkbox to the right of each question label
- When checked: question text greys out, textarea disables, value set to sentinel `"N/A — not applicable"`
- Checked N/A counts as answered for submit button purposes
- N/A answers are included in prompt context so Claude knows the question was intentionally skipped

---

## What is NOT in this milestone

- Editable past answers with cascade re-evaluation (V2)
- Dynamic technology picker (V2)
- Platform integrations: Jira, Monday.com, Confluence (V2)

---

## Assumptions Made

_(Cursor fills this in as it builds)_

## Open Questions

_(Cursor stops and adds here if ambiguity is unresolvable)_
