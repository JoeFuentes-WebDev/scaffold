"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NA_ANSWER_SENTINEL } from "@/constants/answers";
import type { RoundQuestion } from "@/lib/types";

interface QuestionItemProps {
  question: RoundQuestion;
  answer: string;
  isNa: boolean;
  isLoading: boolean;
  onAnswerChange: (questionId: string, value: string) => void;
  onNaChange: (questionId: string, checked: boolean) => void;
}

export function QuestionItem({
  question,
  answer,
  isNa,
  isLoading,
  onAnswerChange,
  onNaChange,
}: QuestionItemProps) {
  function handleAnswerChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    onAnswerChange(question.id, event.target.value);
  }

  function handleNaToggle(checked: boolean | "indeterminate") {
    onNaChange(question.id, checked === true);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <Label
          className={isNa ? "text-[#9CA3AF]" : undefined}
          htmlFor={question.id}
        >
          {question.text}
        </Label>
        <div className="flex items-center gap-2">
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
    </div>
  );
}
