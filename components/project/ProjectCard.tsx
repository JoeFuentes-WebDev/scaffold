import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Project } from "@/lib/types";

interface ProjectCardProps {
  project: Project;
}

function formatCreatedDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="border-[#E5E7EB] bg-white transition-colors hover:border-[#2563EB]">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="text-lg text-[#111827]">
              {project.name}
            </CardTitle>
            <Badge variant="secondary">{project.status}</Badge>
          </div>
          <CardDescription className="text-[#6B7280]">
            Created {formatCreatedDate(project.created_at)}
          </CardDescription>
        </CardHeader>
        {project.description ? (
          <CardContent>
            <p className="line-clamp-2 text-sm text-[#6B7280]">
              {project.description}
            </p>
          </CardContent>
        ) : null}
      </Card>
    </Link>
  );
}
