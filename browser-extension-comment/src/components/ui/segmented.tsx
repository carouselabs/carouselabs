import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

interface SegmentedProps<T extends string> {
  /** Names the group for screen readers ("Length", "Reason"). */
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
}

// A small either/or switch (Short · Medium · Custom). A radio group underneath:
// Tab lands on the chosen option, arrow keys move the choice.
export function Segmented<T extends string>({ label, options, value, onChange, disabled, className }: SegmentedProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function onKeyDown(e: KeyboardEvent, index: number) {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("grid auto-cols-fr grid-flow-col gap-1 rounded-md bg-muted p-1", className)}
    >
      {options.map((option, index) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              "min-h-7 rounded-[5px] px-2 py-1 text-xs font-medium leading-tight text-muted-foreground transition-[color,background-color,box-shadow] duration-fast ease-out hover:text-foreground disabled:opacity-50",
              checked && "bg-card text-foreground shadow-sm",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
