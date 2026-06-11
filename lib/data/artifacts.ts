import type { SupabaseClient } from "@supabase/supabase-js";

import type { Artifact, ArtifactStatus, ArtifactType } from "@/lib/types";

export async function getArtifactsForProject(
  supabase: SupabaseClient,
  projectId: string
): Promise<Artifact[]> {
  const { data, error } = await supabase
    .from("artifacts")
    .select("*")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getArtifactByType(
  supabase: SupabaseClient,
  projectId: string,
  artifactType: ArtifactType
): Promise<Artifact | null> {
  const { data, error } = await supabase
    .from("artifacts")
    .select("*")
    .eq("project_id", projectId)
    .eq("artifact_type", artifactType)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function upsertArtifact(
  supabase: SupabaseClient,
  data: {
    project_id: string;
    artifact_type: ArtifactType;
    content: string;
    status: ArtifactStatus;
    sequence_number: number;
  }
): Promise<Artifact> {
  const { data: artifact, error } = await supabase
    .from("artifacts")
    .upsert(
      {
        project_id: data.project_id,
        artifact_type: data.artifact_type,
        content: data.content,
        status: data.status,
        sequence_number: data.sequence_number,
      },
      { onConflict: "project_id,artifact_type" }
    )
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return artifact;
}
