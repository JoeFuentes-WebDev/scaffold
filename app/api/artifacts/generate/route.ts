import { getAuthenticatedSupabase } from "@/lib/services/authService";
import {
  streamArtifactGeneration,
  validateArtifactGeneration,
} from "@/lib/services/artifactService";
import { verifyProjectAccess } from "@/lib/services/projectAccessService";
import type { ArtifactType } from "@/lib/types";
import { NextResponse } from "next/server";

const VALID_ARTIFACT_TYPES: ArtifactType[] = [
  "onboarding",
  "milestone",
  "review",
  "env_manifest",
];

function isValidArtifactType(value: string): value is ArtifactType {
  return VALID_ARTIFACT_TYPES.includes(value as ArtifactType);
}

interface GenerateArtifactBody {
  project_id?: string;
  artifact_type?: string;
}

function validateGenerateBody(body: GenerateArtifactBody): string | null {
  if (!body.project_id?.trim()) {
    return "project_id is required";
  }

  if (!body.artifact_type?.trim()) {
    return "artifact_type is required";
  }

  if (!isValidArtifactType(body.artifact_type)) {
    return "Invalid artifact_type";
  }

  return null;
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabase();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as GenerateArtifactBody;
  const validationError = validateGenerateBody(body);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const artifactType = body.artifact_type as ArtifactType;

  const hasAccess = await verifyProjectAccess(
    auth.supabase,
    body.project_id!,
    auth.user.id
  );

  if (!hasAccess) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const thresholdValidation = await validateArtifactGeneration(
    auth.supabase,
    body.project_id!,
    artifactType
  );

  if (!thresholdValidation.valid) {
    return NextResponse.json(
      {
        error: "Required domains are not complete",
        missing_domains: thresholdValidation.missing_domains,
      },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await streamArtifactGeneration(
          auth.supabase,
          body.project_id!,
          artifactType,
          (chunk) => {
            controller.enqueue(encoder.encode(chunk));
          }
        );
        controller.close();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Something went wrong generating this artifact. Please try again.";

        console.error("Artifact stream error:", error);
        controller.error(new Error(message));
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
