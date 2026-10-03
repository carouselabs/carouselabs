import { MessageCircle, X } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { PRODUCT_NAME } from "@/lib/platform";

// The same mark in both extensions: its square takes the panel's primary
// colour, purple in LinkedIn's and black (white in dark mode) in X's.

export function Header() {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-background px-3">
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
          <MessageCircle className="h-3.5 w-3.5" />
        </div>
        <h1 className="truncate text-sm font-semibold tracking-tight">{PRODUCT_NAME}</h1>
      </div>

      <Tooltip label="Close panel" side="bottom-end">
        <button
          type="button"
          aria-label="Close panel"
          onClick={() => window.close()}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors duration-fast hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </Tooltip>
    </header>
  );
}
