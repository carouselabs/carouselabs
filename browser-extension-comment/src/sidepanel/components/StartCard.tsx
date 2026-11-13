import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";

// Write's first card while nothing is picked yet, the same in every
// extension: what to do, a little post drawn with the button to click lit
// up, and — off the site — the way back to it. On the extension's canvas
// colours (blue → violet, X's black, Reddit's orange).
export function StartCard({
  title,
  children,
  actions,
  highlight,
  goTo,
}: {
  /** "Pick a post on LinkedIn" / "Open LinkedIn to start". */
  title: string;
  /** One line on where to click. */
  children: ReactNode;
  /** The drawn post's action row ("Like", "Comment", …). */
  actions: string[];
  /** Which of them to light up. */
  highlight: string;
  /** Off the site: a button back to it. */
  goTo?: { label: string; onClick: () => void };
}) {
  return (
    <section className="panel-canvas relative animate-fade-in space-y-3 overflow-hidden rounded-2xl p-4 shadow-sm">
      <h2 className="font-serif-display text-2xl leading-[1.05]">{title}</h2>
      <p className="text-sm leading-relaxed opacity-90">{children}</p>

      {/* Where to click, drawn: decoration, the line above says it. */}
      <div aria-hidden className="space-y-2.5 rounded-2xl bg-card p-3 text-card-foreground shadow-lg">
        <div className="flex items-center gap-2">
          <span className="h-6 w-6 rounded-full bg-muted" />
          <span className="flex-1 space-y-1">
            <span className="block h-1.5 w-2/5 rounded bg-border" />
            <span className="block h-1.5 w-1/4 rounded bg-muted" />
          </span>
        </div>
        <span className="block h-1.5 w-11/12 rounded bg-muted" />
        <span className="block h-1.5 w-3/4 rounded bg-muted" />
        <div className="flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
          {actions.map((a) =>
            a === highlight ? (
              <span
                key={a}
                className="rounded-full bg-[hsl(var(--lime))] px-2.5 py-1 font-bold text-[hsl(246_62%_12%)] shadow-sm"
              >
                {a}
              </span>
            ) : (
              <span key={a}>{a}</span>
            ),
          )}
        </div>
      </div>

      {goTo && (
        <button
          type="button"
          onClick={goTo.onClick}
          className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-full bg-[hsl(var(--canvas-action))] text-sm font-semibold text-[hsl(var(--canvas-action-foreground))] transition-opacity duration-fast hover:opacity-90"
        >
          {goTo.label}
          <ExternalLink aria-hidden className="h-4 w-4" />
        </button>
      )}
    </section>
  );
}
