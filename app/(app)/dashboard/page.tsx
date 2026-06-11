import { AppHeader } from "@/components/layout/AppHeader";
import { ColdStartForm } from "@/components/project/ColdStartForm";
import { ProjectList } from "@/components/project/ProjectList";
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

  if (projects.length === 0) {
    return (
      <div className="flex min-h-full flex-col bg-[#F8F9FA]">
        <AppHeader
          userAvatarUrl={userMetadata.avatar_url}
          userEmail={user.email}
        />
        <div className="flex flex-1 items-center justify-center px-4 py-12">
          <ColdStartForm />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-[#F8F9FA]">
      <AppHeader
        userAvatarUrl={userMetadata.avatar_url}
        userEmail={user.email}
      />
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-[#111827]">Projects</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Select a project to continue building.
          </p>
        </div>
        <ProjectList projects={projects} />
      </div>
    </div>
  );
}
