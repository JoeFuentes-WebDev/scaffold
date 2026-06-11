# MILESTONE_01 — Project Scaffold, Supabase Schema, GitHub Auth, UI Shell

## What this milestone builds

- Next.js App Router project with enforced layer separation
- Supabase schema: projects, domains, rounds, artifacts tables
- GitHub OAuth via Supabase Auth
- UI shell: sidebar nav, 8 domain tabs + Documents tab, section states
- Cold start: project creation form with New/Existing toggle

## Ambiguity protocol

If you encounter a decision not covered here:
- If a safe assumption exists, make it, record it under ## Assumptions Made, and continue
- If no safe assumption exists, stop and add the question to ## Open Questions — do not guess

---

## Stack

- Next.js 14+ App Router
- TypeScript (strict mode)
- Supabase (auth + database)
- Tailwind CSS
- Shadcn/ui (Luma theme, Radix primitives)
- Vercel (deployment target)

---

## Folder Structure

Enforce this structure. Do not deviate.

```
/app
  /api               — API routes only. Thin: validate input, call service, return result.
  /(auth)
    /callback        — Supabase OAuth callback route
    /login           — Login page
  /(app)
    /dashboard       — Project list / home after login
    /projects
      /[id]          — Project workspace (tabs live here)
  layout.tsx
  page.tsx           — Root redirect to /dashboard or /login

/components
  /ui                — Shadcn primitives only
  /layout            — Shell, sidebar, tab nav
  /project           — Project-specific components (ColdStart, DomainTab, etc.)
  /artifacts         — Artifact preview and download components

/lib
  /supabase          — Supabase client (browser) and server client
  /services          — Business logic. Called by API routes only.
  /data              — All Supabase queries. Nothing else touches the DB client.
  /types             — Shared TypeScript types

/hooks               — Custom React hooks

/constants           — Domain definitions, artifact threshold rules, section state enum
```

### Layer rules — strictly enforced

- Components never call Supabase directly. Never.
- Components never contain business logic.
- Service functions live in /lib/services. API routes call them.
- All Supabase queries live in /lib/data.
- API routes are thin: parse request → call service → return response.

---

## Environment Variables

Create `.env.local` with these keys (values left blank — developer fills in):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`ANTHROPIC_API_KEY` is server-side only. Never expose to the browser. Never put in a NEXT_PUBLIC_ variable.

---

## Supabase Schema

Run this SQL in the Supabase SQL editor. Create tables in this order.

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Projects
create table projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  project_type text not null default 'new', -- 'new' | 'existing'
  status text not null default 'active',    -- 'active' | 'archived'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Domains
create table domains (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade not null,
  name text not null, -- 'product' | 'scope' | 'users' | 'architecture' | 'tech_stack' | 'domain_model' | 'engineering_rules' | 'deployment'
  status text not null default 'locked', -- 'locked' | 'available' | 'in_progress' | 'complete'
  data jsonb default '{}'::jsonb,        -- Claude owns the shape of this
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Rounds
create table rounds (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade not null,
  domain_name text not null,
  round_number integer not null,
  status text not null default 'pending', -- 'pending' | 'answered' | 'complete'
  questions jsonb not null default '[]'::jsonb,
  -- questions shape: [{ id, text, answer, follow_up }]
  domains_affected jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Artifacts
create table artifacts (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade not null,
  artifact_type text not null, -- 'onboarding' | 'milestone' | 'review' | 'env_manifest'
  content text,                -- markdown content, null until generated
  status text not null default 'pending', -- 'pending' | 'generated'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row Level Security
alter table projects enable row level security;
alter table domains enable row level security;
alter table rounds enable row level security;
alter table artifacts enable row level security;

-- RLS Policies — users see only their own data
create policy "Users own their projects"
  on projects for all
  using (auth.uid() = user_id);

create policy "Users own their domains"
  on domains for all
  using (project_id in (select id from projects where user_id = auth.uid()));

create policy "Users own their rounds"
  on rounds for all
  using (project_id in (select id from projects where user_id = auth.uid()));

create policy "Users own their artifacts"
  on artifacts for all
  using (project_id in (select id from projects where user_id = auth.uid()));

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger projects_updated_at before update on projects
  for each row execute function update_updated_at();
create trigger domains_updated_at before update on domains
  for each row execute function update_updated_at();
create trigger rounds_updated_at before update on rounds
  for each row execute function update_updated_at();
create trigger artifacts_updated_at before update on artifacts
  for each row execute function update_updated_at();
```

---

## GitHub OAuth Setup

### In Supabase dashboard:
1. Authentication → Providers → GitHub → Enable
2. Copy the Supabase callback URL shown (format: `https://<project>.supabase.co/auth/v1/callback`)

### In GitHub:
1. Settings → Developer Settings → OAuth Apps → New OAuth App
2. Homepage URL: `http://localhost:3000`
3. Authorization callback URL: paste the Supabase callback URL
4. Copy Client ID and Client Secret back into Supabase

### In the app:

`/lib/supabase/client.ts` — browser client:
```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

`/lib/supabase/server.ts` — server client (API routes, Server Components):
```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

`/app/(auth)/callback/route.ts`:
```ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}
```

`/app/(auth)/login/page.tsx` — login page:
- Clean centered card
- App name "Scaffold" in display type
- One-line descriptor: "Project intelligence for AI-assisted builds."
- Single button: "Continue with GitHub"
- Button calls `supabase.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: `${window.location.origin}/auth/callback` } })`

---

## UI Shell

### Shadcn init

Run `npx shadcn@latest init` and select:
- Style: **Luma**
- Base color: Radix
- Accept remaining defaults

After init, override the accent CSS variable in `globals.css` to `#2563EB`.

### Visual direction

Clean, modern, product-focused. Distinct from generic dev-tool defaults.
- Background: `#F8F9FA` (near white, not pure white)
- Surface: `#FFFFFF`
- Border: `#E5E7EB`
- Text primary: `#111827`
- Text secondary: `#6B7280`
- Accent: `#2563EB` (blue — interactive elements, active states)
- Font: Geist (ships with Luma preset)

### Layout

Two-column shell inside `/app/(app)/projects/[id]/page.tsx`:

```
┌─────────────────────────────────────────────────────┐
│ Header: "Scaffold"  •  project name  •  [avatar]    │
├──────────────┬──────────────────────────────────────┤
│              │                                       │
│  Sidebar     │   Main content area                  │
│  (240px)     │                                       │
│              │                                       │
│  Domain tabs │                                       │
│  + Documents │                                       │
│              │                                       │
└──────────────┴──────────────────────────────────────┘
```

### Sidebar — Domain Tab List

Render one item per domain in this order:
1. Product
2. Scope
3. Users
4. Architecture
5. Tech Stack
6. Domain Model
7. Engineering Rules
8. Deployment
9. --- divider ---
10. Documents

Each tab item shows:
- Domain name
- Status badge (right-aligned)

### Section States

Define the type and `cva` variant in `/constants/domains.ts`.
Install `class-variance-authority` if not already present (ships with Shadcn).

```ts
import { cva } from 'class-variance-authority'

export type DomainStatus = 'locked' | 'available' | 'in_progress' | 'complete'

export const domainTabItem = cva(
  'flex items-center justify-between w-full px-3 py-2 rounded-md text-sm transition-colors',
  {
    variants: {
      status: {
        locked:      'text-gray-300 cursor-not-allowed pointer-events-none',
        available:   'text-blue-600 cursor-pointer hover:bg-blue-50',
        in_progress: 'text-amber-500 cursor-pointer hover:bg-amber-50',
        complete:    'text-green-600 cursor-pointer hover:bg-green-50',
      },
    },
    defaultVariants: {
      status: 'locked',
    },
  }
)

export const DOMAIN_STATUS_LABELS: Record<DomainStatus, string> = {
  locked:      'Locked',
  available:   'Available',
  in_progress: 'In Progress',
  complete:    'Complete',
}
```

Usage in the sidebar tab component — no conditionals at the call site:
```tsx
<button className={domainTabItem({ status })}>
  <span>{domain.label}</span>
  <span className="text-xs">{DOMAIN_STATUS_LABELS[status]}</span>
</button>
```

- `locked` — greyed, not clickable
- `available` — blue, clickable
- `in_progress` — amber, clickable
- `complete` — green, clickable, collapsible indicator

### Initial domain states on project creation

When a project is created, seed all 8 domains into the `domains` table with status:
- `product` → `available`
- all others → `locked`

---

## Cold Start Flow

Route: `/app/(app)/dashboard/page.tsx`

### Empty state (no projects yet)

Centered in the page:
```
Create your first project

[text input: "Project name"]

New Project  |  Existing Project   ← toggle, Existing is disabled with "Coming in V2" tooltip

[textarea: "Describe the project. What does it do, who is it for, and what problem does it solve?"]

[Create Project button]
```

### On submit

1. POST to `/api/projects` with `{ name, description, project_type: 'new' }`
2. API route:
   - Validate: name required, description required
   - Call `projectService.createProject(userId, { name, description })`
   - Service creates project row + seeds all 8 domain rows (product = available, rest = locked)
   - Return `{ project_id }`
3. Client redirects to `/projects/[id]`

### Projects exist state

Show a simple list of project cards. Each card: name, created date, status. Click → navigate to `/projects/[id]`.

---

## What is NOT in this milestone

- Claude API integration (questionnaire logic) — Milestone 2
- Artifact generation — Milestone 3
- Existing project flow — V2
- Multiple simultaneous projects UI beyond basic list — V2

---

## Assumptions Made

- OAuth `redirectTo` uses `/callback` (not `/auth/callback` from the login spec) because the `(auth)` route group does not add a URL segment — callback route is at `/callback`.
- Supabase server client uses `await cookies()` per Next.js 15+ async dynamic APIs.
- Auth middleware added to protect `/dashboard` and `/projects/*` and redirect authenticated users away from `/login` and `/callback`.
- Documents tab is UI-only for M1 (not a row in `domains` table); sidebar renders it with static `available` status.
- Schema SQL saved to `supabase/migrations/001_initial_schema.sql` — developer runs it manually in the Supabase SQL editor.
- Server Components fetch data via `/lib/services` (never Supabase directly); services delegate queries to `/lib/data`.

## Open Questions

_(Cursor stops and adds here if ambiguity is unresolvable)_
