import { MessageCircle, Pin, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function Header() {
  const [pinned, setPinned] = useState(false);

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-3">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <MessageCircle className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold">CarouseLabs Comment</span>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={pinned ? "Unpin panel" : "Pin panel"}
          aria-pressed={pinned}
          onClick={() => setPinned((prev) => !prev)}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
            pinned && "bg-accent text-accent-foreground",
          )}
        >
          <Pin className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Close panel"
          onClick={() => window.close()}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
