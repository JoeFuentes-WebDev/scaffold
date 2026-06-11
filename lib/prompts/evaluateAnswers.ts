import type { Round } from "@/lib/types";

export function buildEvaluateAnswersSystemPrompt(domain: string): string {
  return `You are a senior software architect evaluating answers about a software project.

Given the answers just provided, decide:
1. Are there critical gaps in the ${domain} domain that require 1-2 follow-up questions?
2. What information from these answers enriches other domains?
3. What structured data should be stored in each affected domain?

Rules:
- Only ask follow-up questions if a gap is genuinely critical. Do not pad.
- Maximum 2 follow-up questions per round.
- domains_affected must list every domain whose understanding changed.
- domain_updates must contain the structured knowledge to store — Claude owns the shape.
- Return ONLY valid JSON. No preamble, no markdown, no explanation.

Return format:
{
  "action": "follow_up" | "advance",
  "follow_up_questions": [{ "id": "q1", "text": "..." }],
  "domains_affected": ["architecture", "tech_stack"],
  "domain_updates": {
    "architecture": { ... },
    "tech_stack": { ... }
  }
}`;
}

function summarizeAllRounds(rounds: Round[]): string {
  if (rounds.length === 0) {
    return "No previous rounds.";
  }

  return rounds
    .map((round) => {
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

export function buildEvaluateAnswersPrompt(
  project: { name: string; description: string },
  domain: string,
  allRounds: Round[],
  currentAnswers: { question_id: string; answer: string }[]
): string {
  const description = project.description ?? "No description provided.";
  const currentAnswersText = currentAnswers
    .map((item) => `- ${item.question_id}: ${item.answer}`)
    .join("\n");

  return `Project name: ${project.name}
Project description: ${description}
Current domain: ${domain}

All rounds across all domains:
${summarizeAllRounds(allRounds)}

Answers just submitted for the current round:
${currentAnswersText}

Evaluate these answers and decide whether to follow up or advance.`;
}
