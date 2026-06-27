import { DashboardPageClient } from "@/components/project/DashboardPageClient";
import { listProjectsForUser } from "@/lib/services/projectService";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const projects = await listProjectsForUser(user.id);
  const userMetadata = user.user_metadata as {
    avatar_url?: string;
  };

  return (
    <DashboardPageClient
      projects={projects}
      userAvatarUrl={userMetadata.avatar_url}
      userEmail={user.email}
    />
  );
}
