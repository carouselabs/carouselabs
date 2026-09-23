import { useState } from "react";

// A min/max character-range picker: two drag sliders, each with an editable
// number beside it. Shared by the Profile Builder (15-900) and connection
// notes (40-280), so both take their bounds as a prop rather than a constant.

export interface CharBounds {
  min: number;
  max: number;
}

function clampTo(bounds: CharBounds, n: number): number {
  return Math.min(bounds.max, Math.max(bounds.min, Math.round(n)));
}

// One bound: a drag slider plus an editable number, kept in sync. The number is
// a text input with inputMode="numeric" rather than type="number", because
// type="number" renders the browser's own up/down stepper arrows — the control
// this replaced.
function CharBound({
  label,
  value,
  bounds,
  onCommit,
  acceptsWhileTyping,
}: {
  label: string;
  value: number;
  bounds: CharBounds;
  onCommit: (n: number) => void;
  // Gate for live updates from typing. Without it, typing Max "300" while Min
  // is 150 would commit the partial "30", and the clamp would drag Min down
  // to 30 with it — a keystroke silently destroying the other bound.
  acceptsWhileTyping: (n: number) => boolean;
}) {
  // Local text so a half-typed value ("1" on the way to "150") is allowed to
  // exist without being clamped out from under the user mid-keystroke.
  const [text, setText] = useState(String(value));
  // Resync when the value changes from outside (the slider was dragged).
  // Adjusted during render rather than in an effect: React's recommended way
  // to derive state from a changing prop, and it avoids a render with the
  // stale number showing first.
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    setText(String(value));
  }

  function commitText() {
    const n = Number.parseInt(text, 10);
    // An unchanged value must not commit: blur fires on every tab-through, and
    // committing would rewrite an untouched legacy length ("Medium (2-3
    // lines)") as an explicit range just because the field was focused.
    if (Number.isFinite(n) && clampTo(bounds, n) !== value) onCommit(clampTo(bounds, n));
    else setText(String(value));
  }

  return (
    <div className="flex items-center gap-2">
      <span className="w-8 shrink-0 text-[11px] text-muted-foreground">{label}</span>
      <input
        type="range"
        min={bounds.min}
        max={bounds.max}
        // 1, not a coarser step: a typed value off the step grid (137 with a
        // step of 5) would leave the handle on 135 while the box said 137.
        step={1}
        value={value}
        onChange={(e) => onCommit(Number(e.target.value))}
        aria-label={`${label} characters`}
        className="h-2 flex-1 cursor-pointer accent-[#7C3AED]"
      />
      <input
        type="text"
        inputMode="numeric"
        value={text}
        onChange={(e) => {
          const next = e.target.value.replace(/\D/g, "");
          setText(next);
          // Move the slider live only while the typed value is a valid bound
          // that doesn't cross the other one. Crossing is still allowed, just
          // on blur/Enter, where it deliberately pushes the other bound along.
          const n = Number.parseInt(next, 10);
          if (Number.isFinite(n) && n >= bounds.min && n <= bounds.max && acceptsWhileTyping(n)) {
            onCommit(n);
          }
        }}
        onBlur={commitText}
        onKeyDown={(e) => {
          if (e.key === "Enter") commitText();
        }}
        aria-label={`${label} characters (number)`}
        className="w-14 shrink-0 rounded-md border border-input bg-background px-1.5 py-1 text-center text-sm tabular-nums focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </div>
  );
}

// `min`/`max` must already lie within `bounds`. Each bound is clamped against
// the other rather than the pair being rejected, so dragging one handle past
// the other pushes it along.
export function CharRangePicker({
  min,
  max,
  bounds,
  onChange,
  caption,
}: {
  min: number;
  max: number;
  bounds: CharBounds;
  onChange: (min: number, max: number) => void;
  caption: string;
}) {
  const setMin = (n: number) => {
    const next = clampTo(bounds, n);
    onChange(next, Math.max(max, next));
  };
  const setMax = (n: number) => {
    const next = clampTo(bounds, n);
    onChange(Math.min(min, next), next);
  };

  return (
    <div className="space-y-2 rounded-md border border-input p-2">
      <CharBound label="Min" value={min} bounds={bounds} onCommit={setMin} acceptsWhileTyping={(n) => n <= max} />
      <CharBound label="Max" value={max} bounds={bounds} onCommit={setMax} acceptsWhileTyping={(n) => n >= min} />
      <p className="text-[11px] text-muted-foreground">{caption}</p>
    </div>
  );
}
