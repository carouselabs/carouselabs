import * as React from "react";
import { cn } from "@/lib/utils";

// "-end" variants line the hint up with the trigger's right edge, for
// triggers at the right of the panel where a centred hint would be cut off.
type Side = "top" | "top-end" | "bottom" | "bottom-end" | "left";

const SIDE: Record<Side, string> = {
  top: "bottom-full left-1/2 mb-1.5 -translate-x-1/2",
  "top-end": "bottom-full right-0 mb-1.5",
  bottom: "top-full left-1/2 mt-1.5 -translate-x-1/2",
  "bottom-end": "top-full right-0 mt-1.5",
  left: "right-full top-1/2 mr-2 -translate-y-1/2",
};

interface TooltipProps {
  label: string;
  side?: Side;
  children: React.ReactElement;
  className?: string;
}

// A hint for icon buttons: shown on hover (after a short delay, so sweeping
// the mouse across the bar doesn't flash labels) and on keyboard focus.
// Clicking hides it until the pointer leaves: once the button has been used
// the hint has done its job, and would otherwise sit over the content the
// click just brought up. The child keeps its own aria-label, so the hint is
// hidden from screen readers rather than read twice.
export function Tooltip({ label, side = "top", children, className }: TooltipProps) {
  const [dismissed, setDismissed] = React.useState(false);

  return (
    <span
      className={cn("group/tip relative inline-flex", className)}
      onPointerDown={() => setDismissed(true)}
      onPointerLeave={() => setDismissed(false)}
    >
      {children}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background opacity-0 shadow-md transition-opacity duration-fast ease-out",
          !dismissed && "group-hover/tip:opacity-100 group-hover/tip:delay-300 group-has-[:focus-visible]/tip:opacity-100",
          SIDE[side],
        )}
      >
        {label}
      </span>
    </span>
  );
}
