import { useEffect, useRef, useState } from "react";
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

  useEffect(() => {
    copyButtonRef.current?.focus();

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="insert-warning-title"
    >
      <div className="w-full max-w-sm space-y-3 rounded-lg border border-input bg-background p-4 shadow-lg">
        <h2 id="insert-warning-title" className="text-sm font-semibold">
          Heads up: this may put your LinkedIn account at risk
        </h2>

        <p className="text-xs leading-relaxed text-muted-foreground">
          LinkedIn does not allow tools that type or act for you on its site. Using Insert could
          lead LinkedIn to restrict your account. The safer way is to Copy the comment and paste it
          yourself.
        </p>

        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
          />
          Don't show this again
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
