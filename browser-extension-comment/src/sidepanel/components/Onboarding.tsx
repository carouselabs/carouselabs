import { useState } from "react";
import { LINKEDIN_FEED_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";

// Shown once per install after the first successful sign-in. Completion is
// stored in chrome.storage.local rather than on the account: it describes
// whether THIS browser has been set up, and someone installing on a second
// machine should still be told to pin the extension there.
export const ONBOARDING_DONE_STORAGE_KEY = "onboardingComplete";

const CARDS = [
  {
    title: "Click Comment, then Generate",
    body: "On any LinkedIn post, click its Comment button. The post appears here, and Generate writes a comment about it.",
  },
  {
    title: "Profiles control the voice",
    body: "A Comment Profile decides who you sound like, how long the comment is, and what it's trying to do. Pick one before generating.",
  },
  {
    title: "Copy and paste is the safe path",
    body: "LinkedIn doesn't allow tools that act on its site. Copying the comment and pasting it yourself keeps your account out of trouble.",
  },
];

interface Props {
  onCreateProfile: () => void;
  onFinish: () => void;
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
    return (
      <div className="flex h-full flex-col justify-between gap-4 p-4">
        <div className="space-y-2">
          <p className="text-[10px] uppercase text-muted-foreground">
            Step {step + 1} of {CARDS.length}
          </p>
          <h2 className="text-sm font-semibold">{card.title}</h2>
          <p className="text-xs leading-relaxed text-muted-foreground">{card.body}</p>
        </div>

        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => setStep(step + 1)}>
            {step === CARDS.length - 1 ? "Next" : "Got it"}
          </Button>
          <Button variant="ghost" onClick={() => complete()}>
            Skip
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col justify-between gap-4 p-4">
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">How do you want to start?</h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          You can use one of the built-in profiles straight away, or build one in your own voice
          first. You can always change this later.
        </p>
      </div>

      <div className="space-y-2">
        <Button className="w-full" onClick={() => complete()}>
          Start with default profile
        </Button>
        <Button variant="outline" className="w-full" onClick={() => complete(onCreateProfile)}>
          Create my profile now
        </Button>
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => complete(() => chrome.tabs.create({ url: LINKEDIN_FEED_URL }))}
        >
          Open LinkedIn
        </Button>
      </div>
    </div>
  );
}
