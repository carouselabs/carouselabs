import { useState } from "react";
import { ExternalLink, Loader2, LogIn, MessageCircle } from "lucide-react";
import { getApiBaseUrl } from "@/lib/api";
import { CONNECT_PATH, SITE_NAME } from "@/lib/platform";
import { Button } from "@/components/ui/button";

// Shown by App.tsx whenever chrome.storage.local has no extensionToken yet.
// "Sign In" opens app/extension-connect in a new tab, where the user's real
// browser session does the Clerk sign-in normally (no cookie-copying) and
// the resulting token is handed back automatically — see
// src/content/authRelay.ts and src/background.ts for the rest of that
// chain. App.tsx is watching chrome.storage.onChanged, so this screen just
// disappears on its own once the token lands; no manual reload needed.
export function SignInScreen() {
  // Set once the sign-in tab has been opened: the panel then says it is
  // waiting, rather than looking like the click did nothing.
  const [opened, setOpened] = useState(false);

  async function handleSignIn() {
    const baseUrl = await getApiBaseUrl();
    const url = `${baseUrl}${CONNECT_PATH}`;
    // Left in deliberately: chrome.storage.local is scoped per Chrome
    // profile/incognito-mode AND per extension install path, so "I set
    // apiBaseUrl but it still opens production" is almost always storage
    // not actually containing what you expect in *this* context, not a
    // logic bug here — this line makes that instantly checkable.
    console.log("[CarouseLabs Engage] Sign In opening:", url);
    chrome.tabs.create({ url });
    setOpened(true);
  }

  return (
    <main className="flex h-screen w-screen flex-col items-center justify-center bg-background px-6">
      <div className="flex w-full max-w-xs animate-fade-in-up flex-col items-center gap-5 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
          <MessageCircle aria-hidden className="h-6 w-6" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-base font-semibold tracking-tight">Sign in to CarouseLabs</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {SITE_NAME === "X"
              ? "Write X replies and messages in your own voice."
              : "Write LinkedIn comments, replies, notes and messages in your own voice."}
          </p>
        </div>

        {opened ? (
          <div role="status" className="w-full animate-fade-in space-y-3 rounded-lg border bg-card p-4">
            <div className="flex items-center justify-center gap-2 text-sm font-medium">
              <Loader2 aria-hidden className="h-4 w-4 animate-spin text-primary-text" />
              Waiting for sign-in
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Finish signing in on the tab that just opened. This panel updates by itself.
            </p>
            <Button size="sm" variant="ghost" onClick={handleSignIn}>
              Open sign-in again
              <ExternalLink aria-hidden />
            </Button>
          </div>
        ) : (
          <div className="w-full space-y-2">
            <Button className="w-full" onClick={handleSignIn}>
              <LogIn aria-hidden />
              Sign in
            </Button>
            <p className="text-xs text-muted-foreground">Opens carouselabs.com in a new tab.</p>
          </div>
        )}
      </div>
    </main>
  );
}
