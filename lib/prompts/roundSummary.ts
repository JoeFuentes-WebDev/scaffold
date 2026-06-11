import type { Round } from "@/lib/types";

import {
  CLARIFICATION_QUESTION_ID,
  CLARIFICATION_QUESTION_TEXT,
} from "@/constants/answers";

export function isClarificationRound(round: Round): boolean {
  return round.questions.some(
    (question) => question.id === CLARIFICATION_QUESTION_ID
  );
}

export function summarizeRoundsForPrompt(rounds: Round[]): string {
  if (rounds.length === 0) {
    return "No previous rounds.";
  }

  return rounds
    .map((round) => {
      if (isClarificationRound(round)) {
        const clarification = round.questions.find(
          (question) => question.id === CLARIFICATION_QUESTION_ID
        );
        return `Domain: ${round.domain_name}, Clarification (${round.status})\n${CLARIFICATION_QUESTION_TEXT} ${clarification?.answer ?? ""}`;
      }

      const questionsSummary = round.questions
        .map((question) => {
          const answerText = question.answer
            ? `Answer: ${question.answer}`
            : "Answer: (pending)";
          return `- ${question.text}\n  ${answerText}`;
        })
        .join("\n");

      return `Domain: ${round.domain_name}, Round ${round.round_number} (${round.status})\n${questionsSummary}`;
    })
    .join("\n\n");
}
