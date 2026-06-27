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
import { ClipboardIcon } from "lucide-react";
import { QuestionItem } from "@/components/project/QuestionItem";
import { NA_ANSWER_SENTINEL } from "@/constants/answers";
import type { DomainName, EvaluateAnswerInput, Round, SuggestOption } from "@/lib/types";

interface QuestionRoundProps {
  round: Round;
  onSubmit: (answers: EvaluateAnswerInput[]) => void;
  onRegenerate: () => void;
  isLoading: boolean;
  isRegenerating: boolean;
  projectId?: string;
  domainName?: DomainName;
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

function buildNumberedQuestionList(questions: Round["questions"]): string {
  return questions
    .map(function formatQuestion(question, index) {
      return `${index + 1}. ${question.text}`;
    })
    .join("\n");
}

export function QuestionRound({
  round,
  onSubmit,
  onRegenerate,
  isLoading,
  isRegenerating,
  projectId,
  domainName,
}: QuestionRoundProps) {
  const [answers, setAnswers] = useState(buildInitialAnswersForRound);
  const [naChecked, setNaChecked] = useState(buildInitialNaStateForRound);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [optionsQuestionId, setOptionsQuestionId] = useState<string | null>(
    null
  );
  const [suggestedOptions, setSuggestedOptions] = useState<SuggestOption[]>(
    []
  );
  const [isSuggestingOptions, setIsSuggestingOptions] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [showCopiedAll, setShowCopiedAll] = useState(false);

  function buildInitialAnswersForRound() {
    return buildInitialAnswers(round);
  }

  function buildInitialNaStateForRound() {
    return buildInitialNaState(round);
  }

  function syncRoundStateFromProps() {
    setAnswers(buildInitialAnswers(round));
    setNaChecked(buildInitialNaState(round));
    setOptionsQuestionId(null);
    setSuggestedOptions([]);
    setOptionsError(null);
  }

  useEffect(syncRoundStateFromProps, [round.id]);

  useEffect(function dismissCopiedAllConfirmation() {
    if (!showCopiedAll) {
      return undefined;
    }

    const timer = window.setTimeout(function hideCopiedAllConfirmation() {
      setShowCopiedAll(false);
    }, 200);

    return function cleanupCopiedAllConfirmation() {
      window.clearTimeout(timer);
    };
  }, [showCopiedAll]);

  function handleAnswerChange(questionId: string, value: string) {
    function applyAnswerUpdate(previous: Record<string, string>) {
      return {
        ...previous,
        [questionId]: value,
      };
    }

    setAnswers(applyAnswerUpdate);

    if (value.trim()) {
      setOptionsQuestionId(null);
      setSuggestedOptions([]);
    }
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
      setOptionsQuestionId(null);
      setSuggestedOptions([]);
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

  function handleCopyQuestion(text: string) {
    void navigator.clipboard.writeText(text);
  }

  async function handleCopyAllQuestions() {
    const numberedList = buildNumberedQuestionList(round.questions);
    await navigator.clipboard.writeText(numberedList);
    setShowCopiedAll(true);
  }

  async function handleRequestOptions(questionId: string, questionText: string) {
    if (!projectId || !domainName) {
      return;
    }

    setOptionsQuestionId(questionId);
    setSuggestedOptions([]);
    setOptionsError(null);
    setIsSuggestingOptions(true);

    try {
      const response = await fetch("/api/rounds/suggest-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          domain_name: domainName,
          question_text: questionText,
        }),
      });

      const data = (await response.json()) as {
        options?: SuggestOption[];
        error?: string;
      };

      if (!response.ok) {
        setOptionsError(data.error ?? "Failed to load options");
        return;
      }

      setSuggestedOptions(data.options ?? []);
    } catch {
      setOptionsError("Failed to load options");
    } finally {
      setIsSuggestingOptions(false);
    }
  }

  function handleUseOption(questionId: string, description: string) {
    function applyOptionAnswer(previous: Record<string, string>) {
      return {
        ...previous,
        [questionId]: description,
      };
    }

    setAnswers(applyOptionAnswer);
    setOptionsQuestionId(null);
    setSuggestedOptions([]);
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
  const canSuggestOptions = Boolean(projectId && domainName);

  function renderQuestion(question: Round["questions"][number]) {
    return (
      <QuestionItem
        answer={answers[question.id] ?? ""}
        isLoading={isLoading}
        isNa={naChecked[question.id] ?? false}
        isSuggestingOptions={
          isSuggestingOptions && optionsQuestionId === question.id
        }
        key={question.id}
        onAnswerChange={handleAnswerChange}
        onCopyQuestion={handleCopyQuestion}
        onNaChange={handleNaChange}
        onRequestOptions={handleRequestOptions}
        onUseOption={handleUseOption}
        question={question}
        showSuggestOptions={
          canSuggestOptions && optionsQuestionId === question.id
        }
        suggestedOptions={
          optionsQuestionId === question.id ? suggestedOptions : []
        }
      />
    );
  }

  return (
    <>
      <form className="space-y-6" onSubmit={handleSubmit}>
        {round.questions.length > 0 ? (
          <div className="flex items-center justify-end gap-2">
            <Button
              onClick={handleCopyAllQuestions}
              size="sm"
              type="button"
              variant="outline"
            >
              <ClipboardIcon className="size-4" />
              Copy all questions
            </Button>
            {showCopiedAll ? (
              <span className="text-xs font-medium text-[#6B7280]">Copied!</span>
            ) : null}
          </div>
        ) : null}
        {optionsError ? (
          <p className="text-sm text-destructive">{optionsError}</p>
        ) : null}
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
