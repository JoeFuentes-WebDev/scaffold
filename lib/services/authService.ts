import { createClient } from "@/lib/supabase/server";

export async function getAuthenticatedSupabase() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return { supabase, user };
}
