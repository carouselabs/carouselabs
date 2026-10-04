import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

// Stands in for a dropdown while its options load: same height as the
// control that replaces it, so the page doesn't jump when it arrives.
export function LoadingField({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-9 items-center gap-2 rounded-md border border-input bg-card px-3 text-sm text-muted-foreground">
      <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
      {children}
    </div>
  );
}
