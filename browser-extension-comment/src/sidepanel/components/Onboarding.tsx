import { useState, type ComponentType } from "react";
import { ChevronRight, ExternalLink, MousePointerClick, PenLine, ShieldCheck, Sparkles, SlidersHorizontal } from "lucide-react";
import { LINKEDIN_FEED_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Shown once per install after the first successful sign-in. Completion is
// stored in chrome.storage.local rather than on the account: it describes
// whether THIS browser has been set up, and someone installing on a second
// machine should still be told to pin the extension there.
export const ONBOARDING_DONE_STORAGE_KEY = "onboardingComplete";

const CARDS: { title: string; body: string; icon: ComponentType<{ className?: string }> }[] = [
  {
    title: "Click Comment, then Generate",
    body: "On any LinkedIn post, click its Comment button. The post appears here, and Generate writes a comment about it.",
    icon: MousePointerClick,
  },
  {
    title: "Profiles control the voice",
    body: "A Comment Profile decides who you sound like, how long the comment is, and what it's trying to do. Pick one before generating.",
    icon: SlidersHorizontal,
  },
  {
    title: "Copy and paste is the safe path",
    body: "LinkedIn doesn't allow tools that act on its site. Copying the comment and pasting it yourself keeps your account out of trouble.",
    icon: ShieldCheck,
  },
];

interface Props {
  onCreateProfile: () => void;
  onFinish: () => void;
}

// Progress as segments: where you are and how far is left, at a glance.
function Progress({ step, total }: { step: number; total: number }) {
  return (
    <div role="img" aria-label={`Step ${step + 1} of ${total}`} className="flex gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-1 flex-1 rounded-full transition-colors duration-slow ease-out",
            i <= step ? "bg-primary" : "bg-muted",
          )}
        />
      ))}
    </div>
  );
}

function Choice({
  icon: Icon,
  title,
  hint,
  primary,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  hint: string;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-[border-color,background-color,transform] duration-fast ease-out hover:border-primary/50 hover:bg-accent/40 active:scale-[0.99]",
        primary ? "border-primary bg-accent/50" : "bg-card",
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          primary ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon aria-hidden className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs leading-relaxed text-muted-foreground">{hint}</span>
      </span>
      <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

export function Onboarding({ onCreateProfile, onFinish }: Props) {
  // 0..CARDS.length-1 are the intro cards, then the choice screen, then done.
  const [step, setStep] = useState(0);
  const choiceStep = CARDS.length;

  function complete(then?: () => void) {
    chrome.storage.local.set({ [ONBOARDING_DONE_STORAGE_KEY]: true });
    then?.();
    onFinish();
  }

  if (step < choiceStep) {
    const card = CARDS[step];
    const Icon = card.icon;
    return (
      <div className="flex h-full flex-col justify-between gap-6 p-4">
        <div className="space-y-6">
          <Progress step={step} total={CARDS.length} />
          {/* Keyed by step so each card eases in rather than swapping text in place. */}
          <div key={step} className="animate-fade-in-up space-y-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold tracking-tight">{card.title}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{card.body}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {step > 0 && (
            <Button variant="ghost" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          <Button className="flex-1" onClick={() => setStep(step + 1)}>
            Next
          </Button>
          <Button variant="ghost" onClick={() => complete()}>
            Skip
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full animate-fade-in-up flex-col gap-5 p-4">
      <div className="space-y-1.5">
        <h2 className="text-base font-semibold tracking-tight">How do you want to start?</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Use a built-in profile straight away, or build one in your own voice first. You can change this any time.
        </p>
      </div>

      <div className="space-y-2">
        <Choice
          icon={Sparkles}
          primary
          title="Start with default profile"
          hint="Ready now. Make your own later."
          onClick={() => complete()}
        />
        <Choice
          icon={PenLine}
          title="Create my profile now"
          hint="Who you are and how you write, in a few fields."
          onClick={() => complete(onCreateProfile)}
        />
        <Choice
          icon={ExternalLink}
          title="Open LinkedIn"
          hint="Go straight to your feed."
          onClick={() => complete(() => chrome.tabs.create({ url: LINKEDIN_FEED_URL }))}
        />
      </div>

      <button
        type="button"
        onClick={() => setStep(choiceStep - 1)}
        className="w-fit rounded text-xs text-muted-foreground transition-colors duration-fast hover:text-foreground"
      >
        Back
      </button>
    </div>
  );
}
