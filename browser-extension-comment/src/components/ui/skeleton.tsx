import { cn } from "@/lib/utils";

// Placeholder lines while content loads. The shimmer stops under reduced
// motion (styles.css), leaving a still grey bar.
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "h-3 animate-shimmer rounded bg-[length:200%_100%]",
        "bg-[linear-gradient(90deg,hsl(var(--muted))_25%,hsl(var(--border))_50%,hsl(var(--muted))_75%)]",
        className,
      )}
    />
  );
}
