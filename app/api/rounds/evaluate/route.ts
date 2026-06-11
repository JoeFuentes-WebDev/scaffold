import { isValidDomainName } from "@/lib/data/domains";
import { getAuthenticatedSupabase } from "@/lib/services/authService";
import { verifyProjectAccess } from "@/lib/services/projectAccessService";
import { evaluateRound } from "@/lib/services/roundService";
import type { EvaluateAnswerInput } from "@/lib/types";
import { NextResponse } from "next/server";

interface EvaluateRoundBody {
  project_id?: string;
  domain_name?: string;
  round_id?: string;
  answers?: EvaluateAnswerInput[];
}

function validateEvaluateBody(body: EvaluateRoundBody): string | null {
  if (!body.project_id?.trim()) {
    return "project_id is required";
  }

  if (!body.domain_name?.trim()) {
    return "domain_name is required";
  }

  if (!isValidDomainName(body.domain_name)) {
    return "Invalid domain_name";
  }

  if (!body.round_id?.trim()) {
    return "round_id is required";
  }

  if (!body.answers || body.answers.length === 0) {
    return "answers are required";
  }

  const hasEmptyAnswer = body.answers.some(
    (item) => !item.question_id?.trim() || !item.answer?.trim()
  );

  if (hasEmptyAnswer) {
    return "All answers must be non-empty";
  }

  return null;
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabase();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as EvaluateRoundBody;
  const validationError = validateEvaluateBody(body);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const hasAccess = await verifyProjectAccess(
    auth.supabase,
    body.project_id!,
    auth.user.id
  );

  if (!hasAccess) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const result = await evaluateRound(
      auth.supabase,
      body.project_id!,
      body.domain_name!,
      body.round_id!,
      body.answers!
    );

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Something went wrong evaluating answers. Please try again.";

    console.error("Evaluate round error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
