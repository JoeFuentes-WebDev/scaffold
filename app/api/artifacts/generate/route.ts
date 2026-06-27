import { getAuthenticatedSupabase } from "@/lib/services/authService";
import {
  streamArtifactGeneration,
  validateArtifactGeneration,
} from "@/lib/services/artifactService";
import { verifyProjectAccess } from "@/lib/services/projectAccessService";
import type { MilestoneReviewContext } from "@/lib/types";
import {
  GenerateArtifactSchema,
  invalidRequestResponse,
} from "@/lib/schemas";
import { logRouteError } from "@/lib/utils/routeError";
import { NextResponse } from "next/server";

function mapReviewContext(
  reviewContext: NonNullable<
    ReturnType<typeof GenerateArtifactSchema.parse>["review_context"]
  >
): MilestoneReviewContext {
  return {
    completedReview: reviewContext.completed_review,
    openQuestionAnswers: reviewContext.open_question_answers ?? [],
  };
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabase();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = GenerateArtifactSchema.safeParse(body);

  if (!parsed.success) {
    return invalidRequestResponse(parsed.error);
  }

  const data = parsed.data;

  const hasAccess = await verifyProjectAccess(
    auth.supabase,
    data.project_id,
    auth.user.id
  );

  if (!hasAccess) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const thresholdValidation = await validateArtifactGeneration(
    auth.supabase,
    data.project_id,
    data.artifact_type
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

  const reviewContext = data.review_context
    ? mapReviewContext(data.review_context)
    : undefined;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await streamArtifactGeneration(
          auth.supabase,
          data.project_id,
          data.artifact_type,
          (chunk) => {
            controller.enqueue(encoder.encode(chunk));
          },
          {
            regenerate: data.regenerate === true,
            nextMilestone: data.next_milestone === true,
            skippedReview: data.skipped_review === true,
            reviewContext,
          }
        );
        controller.close();
      } catch (error) {
        logRouteError(error, "POST /api/artifacts/generate");
        controller.error(
          new Error(
            "Something went wrong generating this artifact. Please try again."
          )
        );
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
