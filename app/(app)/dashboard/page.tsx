import { AppHeader } from "@/components/layout/AppHeader";
import { DashboardProjectsView } from "@/components/project/DashboardProjectsView";
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
    <div className="flex min-h-full flex-col bg-[#F8F9FA]">
      <AppHeader
        userAvatarUrl={userMetadata.avatar_url}
        userEmail={user.email}
      />
      <DashboardProjectsView projects={projects} />
    </div>
  );
}
