import { useEffect, useRef, type KeyboardEvent } from "react";
import { Plus, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface VoiceOption {
  id: string;
  name: string;
  isDefault?: boolean;
  isRecommended?: boolean;
}

// The voice to write with, as one row of buttons instead of a dropdown: one
// tap to switch, the default marked with a star, and + to make a new one.
// A radio group underneath: Tab lands on the chosen voice, arrow keys move.
export function VoiceChips({
  label,
  options,
  value,
  onChange,
  onCreate,
  createLabel = "Create custom profile",
}: {
  label: string;
  options: VoiceOption[];
  value: string;
  onChange: (id: string) => void;
  onCreate?: () => void;
  createLabel?: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  // Nothing chosen yet: the first takes the Tab stop.
  const focusIndex = Math.max(0, options.findIndex((o) => o.id === value));

  // The chosen voice in view, even when it's far along the row (a default
  // after the recommended ones): scrolls the row sideways only.
  useEffect(() => {
    const chip = refs.current[focusIndex];
    const row = chip?.closest("[data-voice-row]") as HTMLElement | null;
    if (!chip || !row) return;
    const left = chip.offsetLeft - row.offsetLeft;
    if (left < row.scrollLeft || left + chip.offsetWidth > row.scrollLeft + row.clientWidth) {
      row.scrollLeft = Math.max(0, left - 16);
    }
  }, [focusIndex, options.length]);

  function onKeyDown(e: KeyboardEvent, index: number) {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next].id);
    refs.current[next]?.focus();
  }

  return (
    <div className="space-y-1.5">
      <span id="voice-chips-label" className="text-xs font-semibold text-muted-foreground">
        {label}
      </span>
      <div data-voice-row className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-0.5 [scrollbar-width:none]">
        <div role="radiogroup" aria-labelledby="voice-chips-label" className="flex gap-1.5">
          {options.map((o, index) => {
            const checked = o.id === value;
            return (
              <button
                key={o.id}
                ref={(el) => {
                  refs.current[index] = el;
                }}
                type="button"
                role="radio"
                aria-checked={checked}
                tabIndex={index === focusIndex ? 0 : -1}
                onClick={() => onChange(o.id)}
                onKeyDown={(e) => onKeyDown(e, index)}
                // relative: the screen-reader words inside stay in the row,
                // instead of stretching the whole panel sideways.
                className={cn(
                  "relative inline-flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-3 text-xs font-medium transition-[color,background-color,border-color,transform] duration-fast ease-out active:scale-[0.97]",
                  checked
                    ? "panel-night border-transparent font-semibold"
                    : "border-border bg-card text-foreground hover:border-input",
                )}
              >
                {o.isDefault && (
                  <Star
                    aria-hidden
                    className={cn("h-3 w-3", checked ? "fill-[hsl(var(--lime))] text-[hsl(var(--lime))]" : "fill-primary-text text-primary-text")}
                  />
                )}
                {o.name}
                {o.isDefault && <span className="sr-only"> (default)</span>}
                {o.isRecommended && <span className="sr-only"> (recommended)</span>}
              </button>
            );
          })}
        </div>
        {onCreate && (
          <button
            type="button"
            aria-label={createLabel}
            title={createLabel}
            onClick={onCreate}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-input text-primary-text transition-colors duration-fast hover:bg-accent"
          >
            <Plus aria-hidden className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
