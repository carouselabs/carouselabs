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
  /** Absent when Insert is switched off (server kill switch or setting). */
  insert?: { disabled: boolean; inserting: boolean; onClick: () => void } | null;
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

// The finished text and what to do with it, in one card: the text (editable),
// then Copy — the main action, since the user posts every comment themselves —
// and Insert, then the quieter rewrite options. Shared by comments, replies,
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
  const regenerate = onRegenerate && (
    <Tooltip label="Regenerate" side="top-end" className={tools ? "ml-auto" : undefined}>
      <Button size="icon-sm" variant="ghost" aria-label="Regenerate" disabled={regenerateDisabled} onClick={onRegenerate}>
        <RefreshCw aria-hidden className={cn(generating && "animate-spin")} />
      </Button>
    </Tooltip>
  );
  const defaultMeta = generating ? "Writing…" : value.trim() ? `${value.length} character${value.length === 1 ? "" : "s"}` : "";

  return (
    <section
      ref={sectionRef}
      aria-label={label}
      className="animate-fade-in-up overflow-hidden rounded-lg border bg-card shadow-sm transition-[border-color,box-shadow] duration-fast ease-out has-[textarea:focus-visible]:border-ring has-[textarea:focus-visible]:ring-2 has-[textarea:focus-visible]:ring-ring/20"
    >
      <div className="flex items-center justify-between gap-2 px-3 pt-2.5">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="flex items-center gap-2 text-xs tabular-nums text-muted-foreground">
          {meta ?? defaultMeta}
          {generating && onStop && (
            <Button size="sm" variant="ghost" className="-my-1.5 h-7 px-2" onClick={onStop}>
              <Square aria-hidden className="!size-3 fill-current" />
              Stop
            </Button>
          )}
        </span>
      </div>

      {generating && !value ? (
        // Same height as the box that replaces it, so nothing jumps when the
        // text lands.
        <div role="status" aria-label={`Generating ${noun}`} className="min-h-[6rem] space-y-2.5 px-3 pb-3 pt-3">
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
            "max-h-[24rem] min-h-[6rem] rounded-none border-0 bg-transparent px-3 pb-3 pt-1.5 shadow-none focus-visible:ring-0",
            stale && "text-muted-foreground",
          )}
        />
      )}

      {notice && <div className="px-3 pb-2.5">{notice}</div>}

      <div className="space-y-1 border-t bg-muted/40 p-2">
        <div className="flex gap-2">
          <Button size="sm" className="flex-1" disabled={copyDisabled} onClick={onCopy}>
            {copied ? <Check aria-hidden className="animate-pop" /> : <Copy aria-hidden />}
            {copied ? "Copied" : "Copy"}
          </Button>
          {insert && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              disabled={insert.disabled}
              loading={insert.inserting}
              onClick={insert.onClick}
            >
              {!insert.inserting && <ArrowDownToLine aria-hidden />}
              {insert.inserting ? "Inserting…" : "Insert"}
            </Button>
          )}
          {/* With no other tools, Regenerate sits beside Copy rather than
              taking a row of its own. */}
          {!tools && regenerate}
        </div>
        {tools && (
          <div className="flex items-center gap-0.5">
            {tools}
            {regenerate}
          </div>
        )}
      </div>

      <p aria-live="polite" className="sr-only">
        {copied ? "Copied to clipboard" : !busy && !generating && value.trim() ? `${label} is ready` : ""}
      </p>
    </section>
  );
}
