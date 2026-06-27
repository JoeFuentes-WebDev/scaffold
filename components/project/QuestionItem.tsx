"use client";

import { ClipboardIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NA_ANSWER_SENTINEL } from "@/constants/answers";
import type { SuggestOption } from "@/lib/types";
import type { RoundQuestion } from "@/lib/types";

interface QuestionItemProps {
  question: RoundQuestion;
  answer: string;
  isNa: boolean;
  isLoading: boolean;
  showSuggestOptions: boolean;
  isSuggestingOptions: boolean;
  suggestedOptions: SuggestOption[];
  onAnswerChange: (questionId: string, value: string) => void;
  onNaChange: (questionId: string, checked: boolean) => void;
  onCopyQuestion: (text: string) => void;
  onRequestOptions: (questionId: string, questionText: string) => void;
  onUseOption: (questionId: string, description: string) => void;
}

export function QuestionItem({
  question,
  answer,
  isNa,
  isLoading,
  showSuggestOptions,
  isSuggestingOptions,
  suggestedOptions,
  onAnswerChange,
  onNaChange,
  onCopyQuestion,
  onRequestOptions,
  onUseOption,
}: QuestionItemProps) {
  const [showCopiedTooltip, setShowCopiedTooltip] = useState(false);

  useEffect(function dismissCopiedTooltip() {
    if (!showCopiedTooltip) {
      return undefined;
    }

    const timer = window.setTimeout(function hideCopiedTooltip() {
      setShowCopiedTooltip(false);
    }, 200);

    return function cleanupCopiedTooltip() {
      window.clearTimeout(timer);
    };
  }, [showCopiedTooltip]);

  function handleAnswerChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    onAnswerChange(question.id, event.target.value);
  }

  function handleNaToggle(checked: boolean | "indeterminate") {
    onNaChange(question.id, checked === true);
  }

  function handleCopyClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    onCopyQuestion(question.text);
    setShowCopiedTooltip(true);
  }

  function handleSuggestOptionsClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    onRequestOptions(question.id, question.text);
  }

  function handleUseOptionClick(description: string) {
    return function handleUseOption(event: React.MouseEvent<HTMLButtonElement>) {
      event.preventDefault();
      onUseOption(question.id, description);
    };
  }

  function renderSuggestedOption(option: SuggestOption, index: number) {
    const optionLabel = String.fromCharCode(65 + index);

    return (
      <div
        className="rounded-md border border-[#E5E7EB] bg-[#F9FAFB] p-4"
        key={`${question.id}-option-${index}`}
      >
        <p className="text-sm font-medium text-[#111827]">
          Option {optionLabel}: {option.label}
        </p>
        <p className="mt-1 text-sm text-[#374151]">{option.description}</p>
        <p className="mt-2 text-xs text-[#6B7280]">
          Tradeoff: {option.tradeoff}
        </p>
        <div className="mt-3 flex justify-end">
          <Button
            onClick={handleUseOptionClick(option.description)}
            size="sm"
            type="button"
            variant="outline"
          >
            Use this
          </Button>
        </div>
      </div>
    );
  }

  const showEmptyAnswer = !isNa && !answer.trim();

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        <Label
          className={`min-w-0 flex-1 leading-snug ${isNa ? "text-[#9CA3AF]" : "text-[#111827]"}`}
          htmlFor={question.id}
        >
          {question.text}
        </Label>
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              aria-label="Copy question"
              className="text-[#374151]"
              onClick={handleCopyClick}
              size="icon-sm"
              type="button"
              variant="outline"
            >
              <ClipboardIcon className="size-4" />
            </Button>
            {showCopiedTooltip ? (
              <span className="text-xs font-medium text-[#6B7280]">Copied!</span>
            ) : null}
          </div>
          <Checkbox
            checked={isNa}
            disabled={isLoading}
            id={`na-${question.id}`}
            onCheckedChange={handleNaToggle}
          />
          <Label htmlFor={`na-${question.id}`}>N/A</Label>
        </div>
      </div>
      <Textarea
        disabled={isLoading || isNa}
        id={question.id}
        name={question.id}
        onChange={handleAnswerChange}
        rows={4}
        value={isNa ? NA_ANSWER_SENTINEL : answer}
      />
      {showEmptyAnswer ? (
        <Button
          disabled={isLoading || isSuggestingOptions}
          onClick={handleSuggestOptionsClick}
          size="sm"
          type="button"
          variant="outline"
        >
          {isSuggestingOptions
            ? "Loading options..."
            : "I'm not sure — show me options"}
        </Button>
      ) : null}
      {showSuggestOptions && suggestedOptions.length > 0 ? (
        <div className="space-y-3">
          {suggestedOptions.map(renderSuggestedOption)}
        </div>
      ) : null}
    </div>
  );
}
