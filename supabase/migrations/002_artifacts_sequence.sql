-- Unique constraint for artifact upsert by project + type
create unique index if not exists artifacts_project_id_artifact_type_idx
  on artifacts (project_id, artifact_type);

alter table artifacts
  add column if not exists sequence_number integer not null default 1;
