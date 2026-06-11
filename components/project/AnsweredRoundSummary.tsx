"use client";

import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { isClarificationRound } from "@/lib/prompts/roundSummary";
import type { Round } from "@/lib/types";

interface AnsweredRoundSummaryProps {
  round: Round;
}

function formatRoundLabel(round: Round): string {
  if (isClarificationRound(round)) {
    return "Clarification";
  }

  return `Round ${round.round_number}`;
}

export function AnsweredRoundSummary({ round }: AnsweredRoundSummaryProps) {
  const [isOpen, setIsOpen] = useState(false);

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
  }

  return (
    <Collapsible onOpenChange={handleOpenChange} open={isOpen}>
      <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between rounded-md border border-[#E5E7EB] px-4 py-3 text-left text-sm font-medium text-[#111827] hover:bg-[#F9FAFB]">
        <span>{formatRoundLabel(round)}</span>
        <span className="flex items-center gap-2 text-xs text-[#6B7280]">
          Answered
          <ChevronDownIcon
            className={`size-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 rounded-b-md border border-t-0 border-[#E5E7EB] px-4 py-3">
        {round.questions.map((question) => (
          <div key={question.id}>
            <p className="text-sm font-medium text-[#111827]">{question.text}</p>
            <p className="mt-1 text-sm text-[#6B7280]">
              {question.answer ?? "No answer recorded."}
            </p>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
