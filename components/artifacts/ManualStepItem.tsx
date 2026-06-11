import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ManualStepItemProps {
  step: string;
  index: number;
  checked: boolean;
  onToggle: (index: number, checked: boolean) => void;
}

export function ManualStepItem({
  step,
  index,
  checked,
  onToggle,
}: ManualStepItemProps) {
  function handleCheckedChange(checkedValue: boolean | "indeterminate") {
    onToggle(index, checkedValue === true);
  }

  return (
    <div className="flex items-start gap-3">
      <Checkbox
        checked={checked}
        id={`manual-step-${index}`}
        onCheckedChange={handleCheckedChange}
      />
      <Label htmlFor={`manual-step-${index}`}>{step}</Label>
    </div>
  );
}
