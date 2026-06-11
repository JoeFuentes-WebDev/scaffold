-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Projects
create table projects (
  id uuid primary key default gen_random_uuid(),
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
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade not null,
  name text not null, -- 'product' | 'scope' | 'users' | 'architecture' | 'tech_stack' | 'domain_model' | 'engineering_rules' | 'deployment'
  status text not null default 'locked', -- 'locked' | 'available' | 'in_progress' | 'complete'
  data jsonb default '{}'::jsonb,        -- Claude owns the shape of this
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Rounds
create table rounds (
  id uuid primary key default gen_random_uuid(),
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
  id uuid primary key default gen_random_uuid(),
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
