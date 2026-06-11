import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Round } from "@/lib/types";

interface AnsweredRoundSummaryProps {
  round: Round;
}

function formatRoundLabel(round: Round): string {
  return `Round ${round.round_number}`;
}

export function AnsweredRoundSummary({ round }: AnsweredRoundSummaryProps) {
  return (
    <Collapsible className="rounded-md border border-[#E5E7EB]">
      <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-[#111827] hover:bg-[#F9FAFB]">
        <span>{formatRoundLabel(round)}</span>
        <span className="text-xs text-[#6B7280]">Answered</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 border-t border-[#E5E7EB] px-4 py-3">
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
