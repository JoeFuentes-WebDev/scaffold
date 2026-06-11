"use client";

import { useEffect, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { QuestionItem } from "@/components/project/QuestionItem";
import { NA_ANSWER_SENTINEL } from "@/constants/answers";
import type { EvaluateAnswerInput, Round } from "@/lib/types";

interface QuestionRoundProps {
  round: Round;
  onSubmit: (answers: EvaluateAnswerInput[]) => void;
  onRegenerate: () => void;
  isLoading: boolean;
  isRegenerating: boolean;
}

function buildInitialAnswers(round: Round): Record<string, string> {
  const initial: Record<string, string> = {};

  for (const question of round.questions) {
    initial[question.id] = question.answer ?? "";
  }

  return initial;
}

function buildInitialNaState(round: Round): Record<string, boolean> {
  const initial: Record<string, boolean> = {};

  for (const question of round.questions) {
    initial[question.id] = question.answer === NA_ANSWER_SENTINEL;
  }

  return initial;
}

function isQuestionAnswered(
  questionId: string,
  answers: Record<string, string>,
  naChecked: Record<string, boolean>
): boolean {
  if (naChecked[questionId]) {
    return true;
  }

  return Boolean(answers[questionId]?.trim());
}

function areAllQuestionsAnswered(
  round: Round,
  answers: Record<string, string>,
  naChecked: Record<string, boolean>
): boolean {
  return round.questions.every((question) =>
    isQuestionAnswered(question.id, answers, naChecked)
  );
}

export function QuestionRound({
  round,
  onSubmit,
  onRegenerate,
  isLoading,
  isRegenerating,
}: QuestionRoundProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    buildInitialAnswers(round)
  );
  const [naChecked, setNaChecked] = useState<Record<string, boolean>>(() =>
    buildInitialNaState(round)
  );
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);

  useEffect(() => {
    setAnswers(buildInitialAnswers(round));
    setNaChecked(buildInitialNaState(round));
  }, [round.id]);

  function handleAnswerChange(questionId: string, value: string) {
    setAnswers((previous) => ({
      ...previous,
      [questionId]: value,
    }));
  }

  function handleNaChange(questionId: string, checked: boolean) {
    setNaChecked((previous) => ({
      ...previous,
      [questionId]: checked,
    }));

    if (checked) {
      setAnswers((previous) => ({
        ...previous,
        [questionId]: NA_ANSWER_SENTINEL,
      }));
      return;
    }

    setAnswers((previous) => ({
      ...previous,
      [questionId]: "",
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = round.questions.map((question) => ({
      question_id: question.id,
      answer: naChecked[question.id]
        ? NA_ANSWER_SENTINEL
        : answers[question.id]?.trim() ?? "",
    }));

    onSubmit(payload);
  }

  function handleRegenerateClick() {
    setShowRegenerateDialog(true);
  }

  function handleRegenerateConfirm() {
    setShowRegenerateDialog(false);
    onRegenerate();
  }

  function handleRegenerateCancel() {
    setShowRegenerateDialog(false);
  }

  const submitDisabled =
    isLoading || !areAllQuestionsAnswered(round, answers, naChecked);
  const showRegenerateButton = round.status === "pending";

  return (
    <>
      <form className="space-y-6" onSubmit={handleSubmit}>
        {round.questions.map((question) => (
          <QuestionItem
            answer={answers[question.id] ?? ""}
            isLoading={isLoading}
            isNa={naChecked[question.id] ?? false}
            key={question.id}
            onAnswerChange={handleAnswerChange}
            onNaChange={handleNaChange}
            question={question}
          />
        ))}
        <div className="flex flex-wrap gap-3">
          <Button disabled={submitDisabled} type="submit">
            {isLoading ? "Evaluating..." : "Submit Answers"}
          </Button>
          {showRegenerateButton ? (
            <Button
              disabled={isLoading || isRegenerating}
              onClick={handleRegenerateClick}
              type="button"
              variant="outline"
            >
              {isRegenerating ? "Regenerating..." : "Regenerate questions"}
            </Button>
          ) : null}
        </div>
      </form>

      <AlertDialog onOpenChange={setShowRegenerateDialog} open={showRegenerateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate questions?</AlertDialogTitle>
            <AlertDialogDescription>
              This will discard the current questions and generate new ones.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleRegenerateCancel}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleRegenerateConfirm}>
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
