import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Something failed. Says what, in the user's words; the fix (a Try again
// button, a changed label) lives next to it, not inside.
export function Alert({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="alert"
      className={cn(
        "flex animate-fade-in items-start gap-2 rounded-lg border border-destructive/25 bg-destructive-soft p-3 text-destructive",
        className,
      )}
    >
      <AlertCircle aria-hidden className="mt-px h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1 text-xs leading-relaxed">{children}</div>
    </div>
  );
}
