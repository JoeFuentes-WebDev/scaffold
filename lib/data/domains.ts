import type { SupabaseClient } from "@supabase/supabase-js";

import type { Domain } from "@/lib/types";

export async function getDomainsByProjectId(
  supabase: SupabaseClient,
  projectId: string
): Promise<Domain[]> {
  const { data, error } = await supabase
    .from("domains")
    .select("*")
    .eq("project_id", projectId);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
