import { MessagesSquare, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onWrite: () => void;
  onDismiss: () => void;
}

// Shown at the top of the panel while a LinkedIn conversation is open in the
// tab and the Messages screen isn't: most people never go looking for
// Messages on their own. The button takes them there and reads the
// conversation; the click is their choice to have it read.
export function ConversationHint({ onWrite, onDismiss }: Props) {
  return (
    <section
      aria-labelledby="conversation-hint-title"
      className="animate-fade-in-up rounded-lg border border-primary/50 bg-card p-3 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <MessagesSquare aria-hidden className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <h2 id="conversation-hint-title" className="text-sm font-semibold">
            Replying to someone?
          </h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Get AI help writing your reply to this conversation.
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={onWrite}>
          <Sparkles aria-hidden />
          Write a reply with AI
        </Button>
        <Button size="sm" variant="ghost" onClick={onDismiss}>
          Not now
        </Button>
      </div>
    </section>
  );
}
