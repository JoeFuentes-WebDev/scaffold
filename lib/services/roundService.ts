import type { SupabaseClient } from "@supabase/supabase-js";

import { callClaude, parseClaudeJson } from "@/lib/claude/client";
import {
  getDomainByName,
  unlockDomain,
  updateDomainData,
  updateDomainStatus,
} from "@/lib/data/domains";
import { getProjectById } from "@/lib/data/projects";
import {
  createRound,
  deleteRound,
  getPendingRoundForDomain,
  getRoundById,
  getRoundsForDomain,
  getRoundsForProject,
  mergeAnswersIntoQuestions,
  updateRound,
} from "@/lib/data/rounds";
import {
  buildGenerateQuestionsPrompt,
  buildGenerateQuestionsSystemPrompt,
  type GenerateQuestionsResponse,
} from "@/lib/prompts/generateQuestions";
import {
  buildEvaluateAnswersPrompt,
  buildEvaluateAnswersSystemPrompt,
} from "@/lib/prompts/evaluateAnswers";
import type {
  ClaudeEvaluateResponse,
  EvaluateAnswerInput,
  EvaluateResult,
  Round,
  RoundQuestion,
} from "@/lib/types";

import {
  CLARIFICATION_QUESTION_ID,
  CLARIFICATION_QUESTION_TEXT,
} from "@/constants/answers";

function getNextRoundNumber(existingRounds: Round[]): number {
  if (existingRounds.length === 0) {
    return 1;
  }

  const maxRound = Math.max(...existingRounds.map((round) => round.round_number));
  return maxRound + 1;
}

async function applyDomainUpdates(
  supabase: SupabaseClient,
  projectId: string,
  evaluation: ClaudeEvaluateResponse
): Promise<void> {
  for (const domainName of evaluation.domains_affected) {
    const domain = await getDomainByName(supabase, projectId, domainName);
    if (!domain) {
      continue;
    }

    const updates = evaluation.domain_updates[domainName];
    if (updates && Object.keys(updates).length > 0) {
      await updateDomainData(supabase, domain.id, updates);
    }

    await unlockDomain(supabase, projectId, domainName);
  }
}

export async function generateRound(
  supabase: SupabaseClient,
  projectId: string,
  domainName: string,
  options?: { forceRegenerate?: boolean }
): Promise<Round> {
  if (!options?.forceRegenerate) {
    const existingPending = await getPendingRoundForDomain(
      supabase,
      projectId,
      domainName
    );

    if (existingPending) {
      return existingPending;
    }
  }

  const project = await getProjectById(supabase, projectId);
  if (!project) {
    throw new Error("Project not found");
  }

  const existingRounds = await getRoundsForProject(supabase, projectId);
  const domainRounds = await getRoundsForDomain(
    supabase,
    projectId,
    domainName
  );

  const systemPrompt = buildGenerateQuestionsSystemPrompt(domainName);
  const userPrompt = buildGenerateQuestionsPrompt(
    { name: project.name, description: project.description ?? "" },
    domainName,
    existingRounds
  );

  let rawResponse: string;
  try {
    rawResponse = await callClaude(systemPrompt, userPrompt);
  } catch (error) {
    console.error("Claude generate error:", error);
    throw new Error(
      "Something went wrong generating questions. Please try again."
    );
  }

  let parsed: GenerateQuestionsResponse;
  try {
    parsed = parseClaudeJson<GenerateQuestionsResponse>(rawResponse);
  } catch (error) {
    console.error("Claude generate malformed JSON:", rawResponse);
    throw new Error(
      "Something went wrong generating questions. Please try again."
    );
  }

  if (!parsed.questions || parsed.questions.length === 0) {
    console.error("Claude generate missing questions:", rawResponse);
    throw new Error(
      "Something went wrong generating questions. Please try again."
    );
  }

  const round = await createRound(supabase, {
    project_id: projectId,
    domain_name: domainName,
    round_number: getNextRoundNumber(domainRounds),
    status: "pending",
    questions: parsed.questions,
  });

  const domain = await getDomainByName(supabase, projectId, domainName);
  if (domain && domain.status === "available") {
    await updateDomainStatus(supabase, domain.id, "in_progress");
  }

  return round;
}

export async function evaluateRound(
  supabase: SupabaseClient,
  projectId: string,
  domainName: string,
  roundId: string,
  answers: EvaluateAnswerInput[]
): Promise<EvaluateResult> {
  const project = await getProjectById(supabase, projectId);
  if (!project) {
    throw new Error("Project not found");
  }

  const currentRound = await getRoundById(supabase, roundId);
  if (!currentRound) {
    throw new Error("Round not found");
  }

  const answeredQuestions = mergeAnswersIntoQuestions(
    currentRound.questions,
    answers
  );

  await updateRound(supabase, roundId, {
    status: "answered",
    questions: answeredQuestions,
  });

  const allRounds = await getRoundsForProject(supabase, projectId);
  const systemPrompt = buildEvaluateAnswersSystemPrompt(domainName);
  const userPrompt = buildEvaluateAnswersPrompt(
    { name: project.name, description: project.description ?? "" },
    domainName,
    allRounds,
    answers
  );

  let rawResponse: string;
  try {
    rawResponse = await callClaude(systemPrompt, userPrompt);
  } catch (error) {
    console.error("Claude evaluate error:", error);
    throw new Error(
      "Something went wrong evaluating answers. Please try again."
    );
  }

  let evaluation: ClaudeEvaluateResponse;
  try {
    evaluation = parseClaudeJson<ClaudeEvaluateResponse>(rawResponse);
  } catch (error) {
    console.error("Claude evaluate malformed JSON:", rawResponse);
    throw new Error(
      "Something went wrong evaluating answers. Please try again."
    );
  }

  await applyDomainUpdates(supabase, projectId, evaluation);

  if (evaluation.action === "follow_up") {
    const followUpQuestions: RoundQuestion[] = (
      evaluation.follow_up_questions ?? []
    ).map((question) => ({ ...question, follow_up: true }));

    const domainRounds = await getRoundsForDomain(
      supabase,
      projectId,
      domainName
    );

    const followUpRound = await createRound(supabase, {
      project_id: projectId,
      domain_name: domainName,
      round_number: getNextRoundNumber(domainRounds),
      status: "pending",
      questions: followUpQuestions,
      domains_affected: evaluation.domains_affected,
    });

    const domain = await getDomainByName(supabase, projectId, domainName);
    if (domain) {
      await updateDomainStatus(supabase, domain.id, "in_progress");
    }

    return {
      action: "follow_up",
      round: followUpRound,
      domains_affected: evaluation.domains_affected,
    };
  }

  const domain = await getDomainByName(supabase, projectId, domainName);
  if (domain) {
    await updateDomainStatus(supabase, domain.id, "complete");
  }

  return {
    action: "advance",
    round: null,
    domains_affected: evaluation.domains_affected,
  };
}

export async function getDomainRounds(
  supabase: SupabaseClient,
  projectId: string,
  domainName: string
): Promise<Round[]> {
  return getRoundsForDomain(supabase, projectId, domainName);
}

export async function regenerateRound(
  supabase: SupabaseClient,
  projectId: string,
  domainName: string,
  roundId: string
): Promise<Round> {
  const round = await getRoundById(supabase, roundId);

  if (!round) {
    throw new Error("Round not found");
  }

  if (round.status !== "pending") {
    throw new Error("Only pending rounds can be regenerated");
  }

  if (round.project_id !== projectId || round.domain_name !== domainName) {
    throw new Error("Round does not match project or domain");
  }

  await deleteRound(supabase, roundId);

  return generateRound(supabase, projectId, domainName, {
    forceRegenerate: true,
  });
}

export async function createClarificationRound(
  supabase: SupabaseClient,
  projectId: string,
  domainName: string,
  clarificationText: string
): Promise<Round> {
  const domain = await getDomainByName(supabase, projectId, domainName);
  const shouldRestoreComplete = domain?.status === "complete";

  if (shouldRestoreComplete && domain) {
    await updateDomainStatus(supabase, domain.id, "in_progress");
  }

  const domainRounds = await getRoundsForDomain(
    supabase,
    projectId,
    domainName
  );

  const round = await createRound(supabase, {
    project_id: projectId,
    domain_name: domainName,
    round_number: getNextRoundNumber(domainRounds),
    status: "answered",
    questions: [
      {
        id: CLARIFICATION_QUESTION_ID,
        text: CLARIFICATION_QUESTION_TEXT,
        answer: clarificationText,
      },
    ],
  });

  if (shouldRestoreComplete && domain) {
    await updateDomainStatus(supabase, domain.id, "complete");
  }

  return round;
}
