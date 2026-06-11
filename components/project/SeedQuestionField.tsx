"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ColdStartSeedAnswers } from "@/lib/types";

interface SeedQuestionFieldProps {
  fieldKey: keyof ColdStartSeedAnswers;
  label: string;
  value: string;
  onValueChange: (key: keyof ColdStartSeedAnswers, value: string) => void;
}

export function SeedQuestionField({
  fieldKey,
  label,
  value,
  onValueChange,
}: SeedQuestionFieldProps) {
  function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    onValueChange(fieldKey, event.target.value);
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`seed-${fieldKey}`}>{label}</Label>
      <Textarea
        id={`seed-${fieldKey}`}
        onChange={handleChange}
        rows={3}
        value={value}
      />
    </div>
  );
}
