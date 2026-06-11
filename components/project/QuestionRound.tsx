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

function isRoundQuestionAnswered(
  question: Round["questions"][number],
  answers: Record<string, string>,
  naChecked: Record<string, boolean>
): boolean {
  return isQuestionAnswered(question.id, answers, naChecked);
}

function areAllQuestionsAnswered(
  round: Round,
  answers: Record<string, string>,
  naChecked: Record<string, boolean>
): boolean {
  return round.questions.every(function checkQuestionAnswered(question) {
    return isRoundQuestionAnswered(question, answers, naChecked);
  });
}

export function QuestionRound({
  round,
  onSubmit,
  onRegenerate,
  isLoading,
  isRegenerating,
}: QuestionRoundProps) {
  const [answers, setAnswers] = useState(buildInitialAnswersForRound);
  const [naChecked, setNaChecked] = useState(buildInitialNaStateForRound);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);

  function buildInitialAnswersForRound() {
    return buildInitialAnswers(round);
  }

  function buildInitialNaStateForRound() {
    return buildInitialNaState(round);
  }

  function syncRoundStateFromProps() {
    setAnswers(buildInitialAnswers(round));
    setNaChecked(buildInitialNaState(round));
  }

  useEffect(syncRoundStateFromProps, [round.id]);

  function handleAnswerChange(questionId: string, value: string) {
    function applyAnswerUpdate(previous: Record<string, string>) {
      return {
        ...previous,
        [questionId]: value,
      };
    }

    setAnswers(applyAnswerUpdate);
  }

  function handleNaChange(questionId: string, checked: boolean) {
    function applyNaUpdate(previous: Record<string, boolean>) {
      return {
        ...previous,
        [questionId]: checked,
      };
    }

    setNaChecked(applyNaUpdate);

    if (checked) {
      function applyNaAnswerUpdate(previous: Record<string, string>) {
        return {
          ...previous,
          [questionId]: NA_ANSWER_SENTINEL,
        };
      }

      setAnswers(applyNaAnswerUpdate);
      return;
    }

    function clearNaAnswer(previous: Record<string, string>) {
      return {
        ...previous,
        [questionId]: "",
      };
    }

    setAnswers(clearNaAnswer);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    function mapQuestionToAnswer(question: Round["questions"][number]) {
      return {
        question_id: question.id,
        answer: naChecked[question.id]
          ? NA_ANSWER_SENTINEL
          : answers[question.id]?.trim() ?? "",
      };
    }

    const payload = round.questions.map(mapQuestionToAnswer);

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

  function renderQuestion(question: Round["questions"][number]) {
    return (
      <QuestionItem
        answer={answers[question.id] ?? ""}
        isLoading={isLoading}
        isNa={naChecked[question.id] ?? false}
        key={question.id}
        onAnswerChange={handleAnswerChange}
        onNaChange={handleNaChange}
        question={question}
      />
    );
  }

  return (
    <>
      <form className="space-y-6" onSubmit={handleSubmit}>
        {round.questions.map(renderQuestion)}
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
