# ONBOARDING.md — Scaffold V1

## SECTION 1 — HUMAN SUMMARY

Scaffold V1 is a project intelligence system that generates milestone prompt documents (ONBOARDING.md, MILESTONE_XX.md, ENV_MANIFEST.md, REVIEW_XX.md) for AI coding agents via a questionnaire-driven context capture flow. Build phase: active, core domain complete, engineering rules and architecture finalized. Regenerate this file whenever a new domain reaches `complete` status, a clarification changes a layer rule, or a new entity or invariant is added to the domain model.

---

## SECTION 2 — CURSOR DIRECTIVE

### 1. Project Name and Description
**Scaffold V1** — A project intelligence system that generates structured milestone prompt documents to direct AI coding agents through sequential, review-gated project builds.

---

### 2. What It Does and Who It's For
Scaffold V1 allows senior engineers to capture full project context through an 8-domain questionnaire and generate four artifact types consumed by AI coding agents (Cursor, etc.). The feedback loop is: AI agent generates REVIEW_XX.md → engineer reviews and uploads → system prompts for clarifications → AI generates next MILESTONE_XX.md. Sequential milestone flow is enforced; no skipping. Target users are senior engineers who understand architecture tradeoffs. Junior engineer support is deferred to V2.

---

### 3. Folder Structure and Layer Responsibilities

```
/app                        → Next.js App Router pages and API routes
  /api                      → All server-side API routes (no business logic here)
/components                 → UI components only; no data fetching, no service imports
/lib
  /data                     → All Supabase queries; only layer that touches the DB
  /services                 → All business logic: artifactNaming.ts, domainThresholds.ts,
                              domainStatus.ts, reviewParser.ts, artifactService.ts
  /prompts                  → Custom prompt builders for Anthropic API calls
  /utils
    /routeError.ts          → handleRouteError, logRouteError — used in every catch block
/supabase
  /migrations               → All schema changes via Supabase CLI migrations
/tests                      → Vitest test files mirroring source structure
```

---

### 4. Tech Stack

| Technology | Why |
|---|---|
| Next.js App Router (TypeScript strict) | Monolith with collocated API routes; RSC support; production-proven |
| Supabase (PostgreSQL) | Persistent relational state, Auth, schema-level constraints, CLI migrations |
| Anthropic API via `@anthropic-ai/sdk` | Dynamic artifact generation; no templating; server-side only |
| Tailwind CSS | Layout and spacing; no inline styles |
| Shadcn/ui (Luma theme, Radix primitives) | Composition primitives; accessible components |
| Geist font | Default type system |
| Vercel | Deployment platform; streaming mitigates 60s timeout |
| Zod | API route input validation |
| Vitest + `@vitejs/plugin-react` | Critical path testing; 35 tests passing |
| npm | Package manager |
| Supabase CLI | Migration management |
| Node.js 20+ | Runtime requirement |

**Excluded by design:** Docker (V1), Vercel AI SDK (replaced by direct `@anthropic-ai/sdk`), Prisma (replaced by Supabase client libraries), client-side DB calls, any external integrations (Jira, Confluence).

---

### 5. Layer Rules

#### UI Layer (`/components`, `/app` pages)
- **Owns:** rendering, layout, user interaction
- **Must never:** import from `/lib/services` directly, call Supabase, call Anthropic API, contain business logic, use inline styles
- **Communicates via:** `fetch` to API routes only

#### API Routes (`/app/api`)
- **Owns:** request/response handling, input validation with Zod, delegating to services
- **Must never:** contain business logic, query the DB directly, call Anthropic API directly, return `error.message` raw
- **Must always:** wrap entire handler body in try/catch; catch blocks use `handleRouteError` from `@/lib/utils/routeError`; streaming routes use `logRouteError`; no route is complete without a catch block

#### Service Layer (`/lib/services`)
- **Owns:** all business logic — artifact naming, domain thresholds, domain status transitions, review parsing, milestone progression enforcement, artifactService state transition rules
- **Must never:** handle HTTP request/response, render UI, expose raw errors to callers

#### Data Layer (`/lib/data`)
- **Owns:** all Supabase queries; only layer permitted to call Supabase client
- **Must never:** contain business logic, be imported by components, be called from API routes directly (go through services where logic is involved)

#### Prompt Layer (`/lib/prompts`)
- **Owns:** constructing Anthropic API prompts from assembled ProjectModel
- **Must never:** make API calls directly; prompts are passed to service layer which calls Anthropic

---

### 6. Engineering Rules

**DO:**
- Use TypeScript strict mode everywhere; `no any`
- Declare all functions externally and named; no inline functions
- Keep pages small; extract named components
- Write comments that explain *why*, not *what*
- Abstract at 3+ occurrences (not 2) — DRY
- Use Shadcn for composition primitives, Tailwind for layout
- Validate all API inputs with Zod schemas
- Enforce DB constraints at schema level via Supabase migrations
- Wrap every Anthropic API call in try/catch
- Log all errors server-side (console.log at V1)
- Use `handleRouteError` in every API route catch block
- Use `logRouteError` in streaming route catch blocks
- Use native `ReadableStream` for streaming artifact generation
- Save partial artifacts if stream is interrupted
- Run database changes through `/supabase/migrations/` via `npx supabase db push`
- Test domain logic, data transforms, and API routes (critical paths only)
- Keep `SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY` server-side only, never `NEXT_PUBLIC_`
- Assemble full ProjectModel (all domains + all rounds) on every artifact generation API call

**DON'T:**
- Never expose stack traces or raw Claude output to the client
- Never return `error.message` directly from API route catch blocks
- Never call Supabase from components or hooks
- Never call Anthropic API from components, hooks, or outside API routes
- Never use inline styles (use Tailwind classes)
- Never skip the REVIEW_XX.md gate before generating the next MILESTONE_XX.md
- Never allow gaps in round_number sequence within a domain
- Never modify the database directly in production (use migrations)
- Never use the Vercel AI SDK
- Never use Docker at V1
- Never expose `ANTHROPIC_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` as `NEXT_PUBLIC_` variables
- Never write UI component tests (out of scope at V1)
- Never generate MILESTONE_02+ without REVIEW_01 status = `generated`
- Never import `/lib/services` from components — always go through API routes

---

### 7. Current Build Phase and Out of Scope

**Phase:** Active build. All 8 domains complete. Architecture, domain model, engineering rules, and tech stack are locked.

**In scope for V1:**
- Single engineer, single project
- Questionnaire across 8 domains with multi-round support
- Four artifact types: ONBOARDING.md, MILESTONE_XX.md, ENV_MANIFEST.md, REVIEW_XX.md
- Sequential milestone progression with REVIEW gate enforcement
- Full ProjectModel assembly on every generation call
- Streaming artifact generation via native ReadableStream
- Supabase Auth + PostgreSQL persistence
- Vitest critical path tests

**Explicitly out of scope (V1):**
- Multi-user support
- Version history
- Partial ProjectModel views
- External integrations (Jira, Confluence, GitHub)
- Junior engineer UX adaptations
- Proper observability / error tracking (deferred to V2)
- Docker
- Vercel AI SDK
- Any feature that significantly derails from MVP — tag as V(x+1)

---

### 8. Domain Model

#### Entity: `Project`
| Attribute | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | FK to auth.users |
| name | text | Non-empty |
| description | text | |
| project_type | text | |
| status | text | |

**Invariants:** `id` is unique; `user_id` must be valid; `name` must be non-empty.

---

#### Entity: `Domain`
| Attribute | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| project_id | uuid | FK to projects |
| name | text | One of 8 questionnaire domains |
| status | enum | `locked` → `available` → `in_progress` → `complete` |
| data | jsonb | Accumulated domain answers |

**Invariants:** Valid `project_id` required. Status must follow valid transitions. Revisiting a complete domain reopens it to `in_progress`. All previous round data preserved.

**Status values:** `locked`, `available`, `in_progress`, `complete`

---

#### Entity: `Round`
| Attribute | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| project_id | uuid | FK to projects |
| domain_name | text | References domain |
| round_number | integer | Sequential within domain, no gaps |
| status | text | |
| questions | jsonb | Array of Q&A pairs |
| domains_affected | jsonb | |

**Invariants:** `round_number` must be sequential within a domain with no gaps. Only `pending` rounds are deleted on regenerate; answered rounds are preserved.

---

#### Entity: `Artifact`
| Attribute | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| project_id | uuid | FK to projects |
| artifact_type | text | One of four types below |
| content | text | Markdown content |
| status | text | `pending` → `generated` |
| sequence_number | integer | For MILESTONE_XX / REVIEW_XX ordering |

**Artifact types:** `ONBOARDING.md`, `MILESTONE_XX.md`, `REVIEW_XX.md`, `ENV_MANIFEST.md`

**Invariants:**
- MILESTONE_02+ requires preceding REVIEW with `status = generated`
- Status transitions: `pending` → `generated` only
- No skipping sequence numbers
- Partial artifacts saved if stream is interrupted

**Business rules:**
- MILESTONE_02 is blocked until REVIEW_01 `status = generated`
- Enforcement points: UI layer (progression gate) + `artifactService` server-side
- ProjectModel always assembles full history (all domains + all rounds) — no partial views at V1

---

### 9. Must-Always and Must-Never List

**MUST ALWAYS:**
1. Wrap every API route handler body in a top-level try/catch; use `handleRouteError` in catch
2. Use `logRouteError` in streaming route catch blocks
3. Keep `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` server-side only
4. Assemble full ProjectModel (all domains + all rounds) on every artifact generation call
5. Enforce REVIEW_XX gate before generating next MILESTONE_XX — both in UI and in `artifactService`
6. Run all DB schema changes through `/supabase/migrations/` via `npx supabase db push`
7. Validate all API route inputs with Zod before processing
8. Use native `ReadableStream` for artifact generation to mitigate Vercel 60s timeout
9. Save partial artifact content if stream is interrupted
10. All Supabase queries live exclusively in `/lib/data`; all business logic lives exclusively in `/lib/services`

**MUST NEVER:**
1. Never expose stack traces, raw error messages, or raw Claude output to the client
2. Never call Supabase from a component, hook, or client-side code
3. Never call the Anthropic API from anywhere except server-side API routes
4. Never import `/lib/services` from components — route all calls through API routes via fetch
5. Never allow gaps in `round_number` sequence within a domain
6. Never generate MILESTONE_XX without the preceding REVIEW_XX having `status = generated`
7. Never use inline styles — Tailwind classes only
8. Never use the Vercel AI SDK — use `@anthropic-ai/sdk` directly
9. Never modify the Supabase database directly in production
10. Never expose API keys with `NEXT_PUBLIC_` prefix unless they are intentionally public (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL` only)