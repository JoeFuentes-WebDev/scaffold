"use client";

import { useState } from "react";

import { ManualStepItem } from "@/components/artifacts/ManualStepItem";
import { QuestionRound } from "@/components/project/QuestionRound";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getArtifactFilename } from "@/constants/artifacts";
import {
  parseReviewMarkdown,
  type ParsedReview,
} from "@/lib/review/parseReviewMarkdown";
import type { EvaluateAnswerInput, Round } from "@/lib/types";

export interface ReviewGateResult {
  completedReview: string;
  openQuestionAnswers: { question: string; answer: string }[];
  skippedReview: boolean;
}

interface ReviewGateProps {
  reviewSequenceNumber: number;
  nextMilestoneLabel: string;
  onComplete: (result: ReviewGateResult) => void;
  onCancel: () => void;
}

type GateStep = "upload" | "open_questions" | "manual_steps" | "ready";

function buildOpenQuestionsRound(openQuestions: string[]): Round {
  return {
    id: "review-gate",
    project_id: "",
    domain_name: "milestone",
    round_number: 1,
    status: "pending",
    questions: openQuestions.map((text, index) => ({
      id: `open-question-${index}`,
      text,
    })),
    domains_affected: [],
    created_at: "",
    updated_at: "",
  };
}

function convertAnswersToPairs(
  round: Round,
  answers: EvaluateAnswerInput[]
): { question: string; answer: string }[] {
  return answers.map((answer) => {
    const question = round.questions.find(
      (item) => item.id === answer.question_id
    );

    return {
      question: question?.text ?? answer.question_id,
      answer: answer.answer,
    };
  });
}

export function ReviewGate({
  reviewSequenceNumber,
  nextMilestoneLabel,
  onComplete,
  onCancel,
}: ReviewGateProps) {
  const [step, setStep] = useState<GateStep>("upload");
  const [parsedReview, setParsedReview] = useState<ParsedReview | null>(null);
  const [skippedReview, setSkippedReview] = useState(false);
  const [openQuestionAnswers, setOpenQuestionAnswers] = useState<
    { question: string; answer: string }[]
  >([]);
  const [manualStepsChecked, setManualStepsChecked] = useState<
    Record<number, boolean>
  >({});

  const reviewFilename = getArtifactFilename("review", reviewSequenceNumber);
  const openQuestionsRound = parsedReview
    ? buildOpenQuestionsRound(parsedReview.openQuestions)
    : null;

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.name.endsWith(".md")) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const content = String(reader.result ?? "");
      const parsed = parseReviewMarkdown(content);
      setParsedReview(parsed);
      setSkippedReview(false);

      if (parsed.openQuestions.length > 0) {
        setStep("open_questions");
        return;
      }

      if (parsed.manualSteps.length > 0) {
        setStep("manual_steps");
        return;
      }

      setStep("ready");
    };

    reader.readAsText(file);
  }

  function handleSkipReview() {
    setSkippedReview(true);
    setParsedReview(null);
    setStep("ready");
  }

  function handleOpenQuestionsSubmit(answers: EvaluateAnswerInput[]) {
    if (!openQuestionsRound) {
      return;
    }

    const pairs = convertAnswersToPairs(openQuestionsRound, answers);
    setOpenQuestionAnswers(pairs);

    if (parsedReview && parsedReview.manualSteps.length > 0) {
      setStep("manual_steps");
      return;
    }

    setStep("ready");
  }

  function handleManualStepToggle(index: number, checked: boolean) {
    setManualStepsChecked((previous) => ({
      ...previous,
      [index]: checked,
    }));
  }

  function handleContinueFromManualSteps() {
    setStep("ready");
  }

  function areAllManualStepsChecked(): boolean {
    if (!parsedReview) {
      return true;
    }

    return parsedReview.manualSteps.every(
      (_step, index) => manualStepsChecked[index] === true
    );
  }

  function handleGenerateNextMilestone() {
    onComplete({
      completedReview: parsedReview?.rawContent ?? "",
      openQuestionAnswers,
      skippedReview,
    });
  }

  function handleNoOpRegenerate() {}

  function renderUploadStep() {
    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="review-upload">Upload completed {reviewFilename}</Label>
          <input
            accept=".md,text/markdown"
            className="mt-2 block w-full text-sm text-[#6B7280]"
            id="review-upload"
            onChange={handleFileUpload}
            type="file"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSkipReview} type="button" variant="outline">
            Skip review upload
          </Button>
          <Button onClick={onCancel} type="button" variant="ghost">
            Cancel
          </Button>
        </div>
        <p className="text-xs text-[#6B7280]">
          Optional: skip the review upload if you have not completed{" "}
          {reviewFilename} yet.
        </p>
      </div>
    );
  }

  function renderOpenQuestionsStep() {
    if (!openQuestionsRound) {
      return null;
    }

    return (
      <div className="space-y-4">
        <p className="text-sm font-medium text-[#111827]">
          Resolve open questions from the review
        </p>
        <QuestionRound
          isLoading={false}
          isRegenerating={false}
          onRegenerate={handleNoOpRegenerate}
          onSubmit={handleOpenQuestionsSubmit}
          round={openQuestionsRound}
        />
      </div>
    );
  }

  function renderManualStepsStep() {
    if (!parsedReview) {
      return null;
    }

    return (
      <div className="space-y-4">
        <p className="text-sm font-medium text-[#111827]">
          Confirm manual steps are complete
        </p>
        <div className="space-y-3">
          {parsedReview.manualSteps.map((step, index) => (
            <ManualStepItem
              checked={manualStepsChecked[index] ?? false}
              index={index}
              key={step}
              onToggle={handleManualStepToggle}
              step={step}
            />
          ))}
        </div>
        <Button
          disabled={!areAllManualStepsChecked()}
          onClick={handleContinueFromManualSteps}
          type="button"
        >
          Continue
        </Button>
      </div>
    );
  }

  function renderReadyStep() {
    return (
      <div className="space-y-4">
        {skippedReview ? (
          <p className="text-sm text-amber-600">
            Generating without a completed review. Open questions from the
            previous milestone will not be factored in.
          </p>
        ) : null}
        <p className="text-sm text-[#6B7280]">
          Review gate complete. Ready to generate the next milestone.
        </p>
        <div className="flex gap-2">
          <Button onClick={handleGenerateNextMilestone} type="button">
            Generate {nextMilestoneLabel}
          </Button>
          <Button onClick={onCancel} type="button" variant="outline">
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  function renderStepContent() {
    if (step === "upload") {
      return renderUploadStep();
    }

    if (step === "open_questions") {
      return renderOpenQuestionsStep();
    }

    if (step === "manual_steps") {
      return renderManualStepsStep();
    }

    return renderReadyStep();
  }

  return <div className="space-y-2">{renderStepContent()}</div>;
}
