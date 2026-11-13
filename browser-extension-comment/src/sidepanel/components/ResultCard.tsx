import type { ReactNode, Ref } from "react";
import { ArrowDownToLine, Check, Copy, RefreshCw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Props {
  /** What was written: "comment", "reply", "note", "message". Names the card
   *  ("Your note"), its text box, and the loading state ("Generating note"). */
  noun: string;
  value: string;
  onChange: (value: string) => void;
  /** From the click until the result lands. With no text yet, grey lines
   *  stand in for it; text already there stays visible until replaced. */
  generating: boolean;
  /** Text arriving or being rewritten: the box is read-only (full contrast,
   *  just not editable) and Copy/Insert wait. */
  busy: boolean;
  /** The text showing is the previous result, about to be replaced (a
   *  regenerate that doesn't stream): shown muted until the new one lands. */
  stale?: boolean;
  /** Right side of the header. Defaults to "Writing…" or the length. */
  meta?: ReactNode;
  copied: boolean;
  copyDisabled: boolean;
  onCopy: () => void;
  /** Absent when Insert is switched off (server kill switch or setting).
   *  `inserted`: it just landed — the button says so for a moment and can't
   *  be clicked (src/sidepanel/useInsert.ts). */
  insert?: { disabled: boolean; inserting: boolean; inserted?: boolean; onClick: () => void } | null;
  /** Quiet extra actions left of Regenerate (Shorter / Longer). */
  tools?: ReactNode;
  onRegenerate?: () => void;
  regenerateDisabled?: boolean;
  /** While generating: a Stop button in the header, so a long wait can be
   *  ended instead of sat through. */
  onStop?: () => void;
  /** Inside the card under the text, e.g. a length warning. */
  notice?: ReactNode;
  sectionRef?: Ref<HTMLElement>;
}

// The finished text and what to do with it, in one card on the extension's
// canvas colours (blue → violet; X's black; Reddit's orange): the text
// (editable) on a white bubble, the quieter rewrite options, then Insert —
// the main action when it's on — and Copy. Shared by comments, replies,
// connection notes and messages so all four behave the same.
export function ResultCard({
  noun,
  value,
  onChange,
  generating,
  busy,
  stale = false,
  meta,
  copied,
  copyDisabled,
  onCopy,
  insert,
  tools,
  onRegenerate,
  regenerateDisabled,
  onStop,
  notice,
  sectionRef,
}: Props) {
  const label = `Your ${noun}`;
  const onCanvas =
    "text-[hsl(var(--canvas-foreground))] hover:bg-white/15 hover:text-[hsl(var(--canvas-foreground))] disabled:opacity-50";
  const regenerate = onRegenerate && (
    <Tooltip label="Regenerate" side="top-end" className="ml-auto">
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="Regenerate"
        disabled={regenerateDisabled}
        onClick={onRegenerate}
        className={cn("rounded-full", onCanvas)}
      >
        <RefreshCw aria-hidden className={cn(generating && "animate-spin")} />
      </Button>
    </Tooltip>
  );
  const defaultMeta = generating ? "Writing…" : value.trim() ? `${value.length} character${value.length === 1 ? "" : "s"}` : "";
  // The main action on the canvas: lime (white on X's and Reddit's).
  const mainAction =
    "h-9 flex-1 rounded-full bg-[hsl(var(--canvas-action))] text-sm font-bold text-[hsl(var(--canvas-action-foreground))] hover:bg-[hsl(var(--canvas-action))] hover:opacity-90";
  const nightAction =
    "h-9 rounded-full bg-[hsl(var(--night))] px-4 text-sm font-semibold text-[hsl(var(--night-foreground))] hover:bg-[hsl(var(--night))] hover:opacity-90";

  const copyButton = (
    <Button className={insert ? nightAction : mainAction} disabled={copyDisabled} onClick={onCopy}>
      {copied ? <Check aria-hidden className="animate-pop" /> : <Copy aria-hidden />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );

  return (
    <section
      ref={sectionRef}
      aria-label={label}
      className="panel-canvas animate-fade-in-up space-y-2.5 overflow-hidden rounded-2xl p-3 shadow-sm"
    >
      <div className="flex items-center justify-between gap-2 px-0.5">
        <span className="font-serif-display text-lg leading-none">{label}</span>
        <span className="flex items-center gap-2 text-xs tabular-nums opacity-80">
          {meta ?? defaultMeta}
          {generating && onStop && (
            <Button size="sm" variant="ghost" className={cn("-my-1.5 h-7 rounded-full px-2.5", onCanvas)} onClick={onStop}>
              <Square aria-hidden className="!size-3 fill-current" />
              Stop
            </Button>
          )}
        </span>
      </div>

      <div className="overflow-hidden rounded-[18px_18px_18px_6px] bg-card text-card-foreground shadow-sm transition-shadow duration-fast ease-out has-[textarea:focus-visible]:ring-2 has-[textarea:focus-visible]:ring-[hsl(var(--lime))]">
        {generating && !value ? (
          // Same height as the box that replaces it, so nothing jumps when the
          // text lands.
          <div role="status" aria-label={`Generating ${noun}`} className="min-h-[5rem] space-y-2.5 px-3 pb-3 pt-3">
            <Skeleton className="w-11/12" />
            <Skeleton className="w-full" />
            <Skeleton className="w-3/5" />
          </div>
        ) : (
          <Textarea
            autoGrow
            aria-label={label}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            readOnly={busy}
            aria-busy={busy || undefined}
            placeholder="Write your own here, or regenerate."
            className={cn(
              "max-h-[24rem] min-h-[5rem] rounded-none border-0 bg-transparent px-3 pb-2.5 pt-2.5 text-sm leading-relaxed shadow-none focus-visible:ring-0",
              stale && "text-muted-foreground",
            )}
          />
        )}
        {notice && <div className="px-3 pb-2.5">{notice}</div>}
      </div>

      {(tools || regenerate) && (
        // Shorter / Longer come in as quiet buttons: white on the canvas.
        <div className="flex items-center gap-0.5 [&_button]:rounded-full [&_button]:text-[hsl(var(--canvas-foreground))] [&_button:hover]:bg-white/15 [&_button:hover]:text-[hsl(var(--canvas-foreground))]">
          {tools}
          {regenerate}
        </div>
      )}

      <div className="flex gap-2">
        {insert && (
          <Button className={mainAction} disabled={insert.disabled || insert.inserted} loading={insert.inserting} onClick={insert.onClick}>
            {!insert.inserting && (insert.inserted ? <Check aria-hidden className="animate-pop" /> : <ArrowDownToLine aria-hidden />)}
            {insert.inserting ? "Inserting…" : insert.inserted ? "Inserted" : "Insert"}
          </Button>
        )}
        {copyButton}
      </div>

      <p aria-live="polite" className="sr-only">
        {copied
          ? "Copied to clipboard"
          : insert?.inserted
            ? "Inserted"
            : !busy && !generating && value.trim()
              ? `${label} is ready`
              : ""}
      </p>
    </section>
  );
}
