export type ProjectType = "new" | "existing";

export type ProjectStatus = "active" | "archived";

export type DomainName =
  | "product"
  | "scope"
  | "users"
  | "architecture"
  | "tech_stack"
  | "domain_model"
  | "engineering_rules"
  | "deployment";

export type DomainStatus = "locked" | "available" | "in_progress" | "complete";

export type RoundStatus = "pending" | "answered" | "complete";

export type ArtifactType =
  | "onboarding"
  | "milestone"
  | "review"
  | "env_manifest";

export type ArtifactStatus = "pending" | "generated" | "partial";

export interface Artifact {
  id: string;
  project_id: string;
  artifact_type: ArtifactType;
  content: string | null;
  status: ArtifactStatus;
  sequence_number: number;
  created_at: string;
  updated_at: string;
}

export interface GenerateArtifactInput {
  project_id: string;
  artifact_type: ArtifactType;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  project_type: ProjectType;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface Domain {
  id: string;
  project_id: string;
  name: DomainName;
  status: DomainStatus;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectInput {
  name: string;
  description: string;
  project_type?: ProjectType;
}

export interface RoundQuestion {
  id: string;
  text: string;
  answer?: string;
  follow_up?: boolean;
}

export interface Round {
  id: string;
  project_id: string;
  domain_name: string;
  round_number: number;
  status: RoundStatus;
  questions: RoundQuestion[];
  domains_affected: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateRoundInput {
  project_id: string;
  domain_name: string;
  round_number: number;
  status?: RoundStatus;
  questions: RoundQuestion[];
  domains_affected?: string[];
}

export interface EvaluateAnswerInput {
  question_id: string;
  answer: string;
}

export interface ClaudeEvaluateResponse {
  action: "follow_up" | "advance";
  follow_up_questions?: RoundQuestion[];
  domains_affected: string[];
  domain_updates: Record<string, Record<string, unknown>>;
}

export interface UpdateProjectInput {
  description: string;
}

export interface ProjectModel {
  project: Project;
  domains: Domain[];
  rounds: Round[];
}

export interface CheckDomainUnlocksResult {
  unlocked_domains: DomainName[];
  documents_status: DomainStatus;
}

export interface UpdateProjectResult {
  project: Project;
  pending_domains: DomainName[];
}

export interface EvaluateResult {
  action: "follow_up" | "advance";
  round: Round | null;
  domains_affected: string[];
}
