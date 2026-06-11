import type { Round } from "@/lib/types";

export function buildGenerateQuestionsSystemPrompt(domain: string): string {
  return `You are a senior software architect helping an engineer document a software project.
Your job is to ask focused questions that build a complete picture of the project's ${domain} domain.

Rules:
- Ask 3-4 questions per round. Never more.
- Questions must be specific, not generic.
- Do not ask about things already answered in previous rounds.
- Each question should surface a decision, constraint, or assumption that affects how the project gets built.
- Return ONLY valid JSON. No preamble, no markdown, no explanation.

Return format:
{
  "questions": [
    { "id": "q1", "text": "..." },
    { "id": "q2", "text": "..." },
    { "id": "q3", "text": "..." }
  ]
}`;
}

function summarizeRounds(rounds: Round[]): string {
  if (rounds.length === 0) {
    return "No previous rounds.";
  }

  return rounds
    .map((round) => {
      const answeredQuestions = round.questions
        .filter((question) => question.answer)
        .map(
          (question) =>
            `Q: ${question.text}\nA: ${question.answer ?? ""}`
        )
        .join("\n");

      return `Round ${round.round_number} (${round.domain_name}, ${round.status}):\n${answeredQuestions || "No answers yet."}`;
    })
    .join("\n\n");
}

export function buildGenerateQuestionsPrompt(
  project: { name: string; description: string },
  domain: string,
  existingRounds: Round[]
): string {
  const description = project.description ?? "No description provided.";

  return `Project name: ${project.name}
Project description: ${description}
Domain: ${domain}

Previous rounds across all domains:
${summarizeRounds(existingRounds)}

Generate 3-4 focused questions for the ${domain} domain.`;
}

export interface GenerateQuestionsResponse {
  questions: { id: string; text: string }[];
}
