import type { Project } from "@/lib/types";

import { ProjectCard } from "@/components/project/ProjectCard";

interface ProjectListProps {
  projects: Project[];
}

export function ProjectList({ projects }: ProjectListProps) {
  function renderProjectCard(project: Project) {
    return <ProjectCard key={project.id} project={project} />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map(renderProjectCard)}
    </div>
  );
}
