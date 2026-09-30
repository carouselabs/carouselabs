import type { ReactNode } from "react";

// The title block every screen but Home opens with: its name (the same word
// as its side icon), one line on what it's for, and room for one action.
export function ScreenHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 space-y-0.5">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
