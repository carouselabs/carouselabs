import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

// Copy is fixed by the safety spec and should not be softened: it is the only
// point at which the user is told that Insert carries a real risk to their
// LinkedIn account. "Copy instead" is the default and takes focus on open, so
// the safer path is what a stray Enter press chooses.
interface Props {
  onCopyInstead: () => void;
  onInsertAnyway: (dontShowAgain: boolean) => void;
  onDismiss: () => void;
}

export function InsertWarningModal({ onCopyInstead, onInsertAnyway, onDismiss }: Props) {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const copyButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  // The parent passes a new onDismiss on every render; reading it through a
  // ref keeps the open/close effect below to one run, so focus isn't pulled
  // back to Copy each time the screen behind re-renders.
  const dismissRef = useRef(onDismiss);
  useLayoutEffect(() => {
    dismissRef.current = onDismiss;
  });

  useEffect(() => {
    // Focus goes back to whatever opened the warning (the Insert button) when
    // it closes, so a keyboard user carries on from where they were.
    const opener = document.activeElement as HTMLElement | null;
    copyButtonRef.current?.focus();

    function handleKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") dismissRef.current();
    }
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      opener?.focus?.();
    };
  }, []);

  // Tab stays inside the warning while it is open: the page behind is
  // covered, so focus wandering there would be invisible.
  function trapTab(e: KeyboardEvent) {
    if (e.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>("button, input");
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      // A click on the dimmed area (not the card) backs out, like Escape.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onDismiss();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="insert-warning-title"
        aria-describedby="insert-warning-body"
        onKeyDown={trapTab}
        className="w-full max-w-sm animate-scale-in space-y-4 rounded-xl border bg-card p-5 shadow-xl"
      >
        <div className="space-y-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-warning-soft text-warning">
            <ShieldAlert aria-hidden className="h-5 w-5" />
          </div>
          <h2 id="insert-warning-title" className="text-base font-semibold leading-snug">
            Heads up: this may put your LinkedIn account at risk
          </h2>
          <p id="insert-warning-body" className="text-sm leading-relaxed text-muted-foreground">
            LinkedIn does not allow tools that type or act for you on its site. Using Insert could
            lead LinkedIn to restrict your account. The safer way is to Copy the comment and paste it
            yourself.
          </p>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            className="h-4 w-4 shrink-0 accent-primary"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
          />
          Don&apos;t show this again
        </label>

        <div className="flex flex-col gap-2">
          <Button ref={copyButtonRef} onClick={onCopyInstead}>
            Copy instead
          </Button>
          <Button variant="outline" onClick={() => onInsertAnyway(dontShowAgain)}>
            Insert anyway
          </Button>
        </div>
      </div>
    </div>
  );
}
