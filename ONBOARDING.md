This is Scaffold V1, a project intelligence system that generates milestone prompt documents for AI coding agents. Currently in active development focusing on questionnaire-driven context capture with four generated artifacts. Regenerate when core domains or milestone flow changes.

---

# Scaffold V1 — Project intelligence system for directing AI coding agents through milestone-based development

## Project Purpose
Scaffold V1 enables engineers to generate milestone prompt documents for AI coding agents. System captures project context through questionnaires across 8 domains and generates four artifacts: ONBOARDING.md, MILESTONE_XX.md, REVIEW_XX.md, and ENV_MANIFEST.md. Target users are senior engineers who understand architecture tradeoffs.

## Folder Structure
```
/app                 # Next.js App Router (UI layer)
/lib/data           # Supabase client abstractions (data layer)
/lib/prompts        # AI prompt builders (service layer)
/lib/services       # Business logic (service layer)
/supabase/migrations # Database schema versioning
```

## Tech Stack
- **Frontend**: Next.js App Router, TypeScript (strict), Tailwind CSS, Shadcn/ui (Luma theme), Geist font
- **Backend**: Node.js 20+, Supabase (PostgreSQL + Auth), Anthropic API via @anthropic-ai/sdk
- **Deployment**: Vercel, npm, Supabase CLI
- **Validation**: Zod for API routes
- **Rationale**: Recent stable tech with good support, avoid bleeding edge, server-side AI only

## Layer Rules
**UI Layer**: Milestone progression validation, auth state, never direct DB calls or AI calls
**Service Layer**: Business rules, artifact generation, state transitions, AI integration server-side only
**Data Layer**: Supabase abstractions in /lib/data, foreign key relationships, schema constraints

**UI must never**: Make DB calls, call AI APIs, contain business logic
**Service must never**: Expose raw errors, skip validation, allow direct DB access from client
**Data must never**: Contain business rules, expose internal errors, allow constraint violations

## Engineering Rules
**DO**: TypeScript strict mode, external named functions only, abstract at 3+ occurrences, test critical paths, Zod API validation, human-readable comments explaining why, server-side error logging

**DON'T**: Inline functions, any types, client-side DB calls, expose stack traces, skip milestone sequences, template generation (always LLM), Docker at V1, Vercel AI SDK

**Error Handling**: Wrap all Anthropic calls in try/catch, return user-readable messages, log server-side, never expose raw Claude output

## Current Build Phase
V1 MVP with single engineer, single project, questionnaire-driven context capture. **Out of scope**: external integrations (Jira, Confluence), multi-user, version history, Docker, client-side AI, partial project views.

## Domain Model
**Project**: id, user_id, name, description, project_type, status. Invariants: unique id, valid user_id, non-empty name.

**Domain**: id, project_id, name, status (locked/available/in_progress/complete), data (jsonb). Invariants: valid project_id, valid status transitions.

**Round**: id, project_id, domain_name, round_number, status, questions (jsonb), domains_affected. Invariants: sequential round_number within domain, no gaps.

**Artifact**: id, project_id, artifact_type (ONBOARDING/MILESTONE_XX/REVIEW_XX/ENV_MANIFEST), content, status (pending/generated), sequence_number. Invariants: MILESTONE_XX requires preceding REVIEW_XX.

**Business Rules**: All rounds preserved, sequential flow enforced, domains can be revisited, full ProjectModel assembled on every call.

## Must Always
- Enforce milestone sequence (no MILESTONE_02 without REVIEW_01 generated)
- Use server-side only for AI and database operations
- Validate all API inputs with Zod schemas
- Log errors server-side with user-friendly messages
- Generate artifacts from full ProjectModel context
- Preserve all round history except pending rounds on regenerate
- Stream artifact generation to mitigate Vercel timeout
- Apply database migrations via Supabase CLI only
- Use TypeScript strict mode throughout
- Abstract repeated code at 3+ occurrences

## Must Never
- Allow client-side database calls or AI API calls
- Skip milestone sequences or allow gaps in round numbers
- Expose stack traces or raw Anthropic API responses
- Use templated artifact generation (always LLM-generated)
- Modify production database directly
- Store API keys in NEXT_PUBLIC_ environment variables
- Use inline functions or any TypeScript types
- Allow partial ProjectModel views at V1
- Include Docker or external integrations
- Permit UI components to contain business logic