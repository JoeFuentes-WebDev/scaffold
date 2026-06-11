"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EvaluateAnswerInput, Round } from "@/lib/types";

interface QuestionRoundProps {
  round: Round;
  onSubmit: (answers: EvaluateAnswerInput[]) => void;
  isLoading: boolean;
}

function buildInitialAnswers(round: Round): Record<string, string> {
  const initial: Record<string, string> = {};

  for (const question of round.questions) {
    initial[question.id] = question.answer ?? "";
  }

  return initial;
}

function areAllAnswersFilled(
  round: Round,
  answers: Record<string, string>
): boolean {
  return round.questions.every((question) => answers[question.id]?.trim());
}

export function QuestionRound({ round, onSubmit, isLoading }: QuestionRoundProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    buildInitialAnswers(round)
  );

  useEffect(() => {
    setAnswers(buildInitialAnswers(round));
  }, [round.id]);

  function handleAnswerChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const questionId = event.target.name;
    const value = event.target.value;

    setAnswers((previous) => ({
      ...previous,
      [questionId]: value,
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = round.questions.map((question) => ({
      question_id: question.id,
      answer: answers[question.id]?.trim() ?? "",
    }));

    onSubmit(payload);
  }

  const submitDisabled = isLoading || !areAllAnswersFilled(round, answers);

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {round.questions.map((question) => (
        <div className="space-y-2" key={question.id}>
          <Label htmlFor={question.id}>{question.text}</Label>
          <Textarea
            disabled={isLoading}
            id={question.id}
            name={question.id}
            onChange={handleAnswerChange}
            rows={4}
            value={answers[question.id] ?? ""}
          />
        </div>
      ))}
      <Button disabled={submitDisabled} type="submit">
        {isLoading ? "Evaluating..." : "Submit Answers"}
      </Button>
    </form>
  );
}
