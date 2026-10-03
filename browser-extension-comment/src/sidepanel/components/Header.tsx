import { MessageCircle, X } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { PLATFORM, PRODUCT_NAME } from "@/lib/platform";

// CarouseLabs Engage for X's mark, as on its toolbar icon (public-x/icons):
// the bubble filled, with an X in it.
function XMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5">
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <text
        x="12.4"
        y="12.3"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Segoe UI, Arial, sans-serif"
        fontWeight="800"
        fontSize="12.5"
        className="fill-primary"
      >
        X
      </text>
    </svg>
  );
}

export function Header() {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-background px-3">
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
          {PLATFORM === "x" ? <XMark /> : <MessageCircle className="h-3.5 w-3.5" />}
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
