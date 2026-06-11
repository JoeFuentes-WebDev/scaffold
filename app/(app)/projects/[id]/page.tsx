import { ProjectShell } from "@/components/layout/ProjectShell";
import { getProjectWithDomains } from "@/lib/services/projectService";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const result = await getProjectWithDomains(id);

  if (!result) {
    notFound();
  }

  const userMetadata = user.user_metadata as {
    avatar_url?: string;
  };

  return (
    <ProjectShell
      domains={result.domains}
      projectId={result.project.id}
      projectName={result.project.name}
      userAvatarUrl={userMetadata.avatar_url}
      userEmail={user.email}
    />
  );
}
