import type { SupabaseClient } from "@supabase/supabase-js";

import { getProjectById } from "@/lib/data/projects";

export async function verifyProjectAccess(
  supabase: SupabaseClient,
  projectId: string,
  userId: string
): Promise<boolean> {
  const project = await getProjectById(supabase, projectId);

  if (!project) {
    return false;
  }

  return project.user_id === userId;
}
