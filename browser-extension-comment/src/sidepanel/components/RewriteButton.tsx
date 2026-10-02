import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  /** The action, naming what is now picked: "Rewrite with Supportive Peer". */
  label: string;
  /** What wrote the text showing now: "Current comment: Thoughtful Expert". */
  current: string;
  onClick: () => void;
}

// Shown under a profile (or reason) picker once it no longer matches what
// wrote the text in the card below. Changing the profile is exactly when
// someone wants a new version, and the small Regenerate icon in the card is
// easy to miss.
export function RewriteButton({ label, current, onClick }: Props) {
  return (
    <div className="animate-fade-in-up space-y-1.5 pt-1">
      <Button className="w-full" onClick={onClick} title={label}>
        <Sparkles aria-hidden />
        <span className="min-w-0 truncate">{label}</span>
      </Button>
      <p className="truncate text-center text-xs text-muted-foreground" title={current}>
        {current}
      </p>
    </div>
  );
}
