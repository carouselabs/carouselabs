import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  /** The id of the text that names this switch. */
  labelledBy?: string;
  describedBy?: string;
}

// An on/off setting that applies straight away (no Save button), which is
// what a switch promises and a checkbox doesn't.
export function Switch({ checked, onCheckedChange, disabled, labelledBy, describedBy }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent transition-colors duration-normal ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-input",
      )}
    >
      <span
        aria-hidden
        className={cn(
          // primary-foreground: white in both themes, as a knob should be.
          "block h-4 w-4 rounded-full bg-primary-foreground shadow-sm transition-transform duration-normal ease-out",
          checked ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
