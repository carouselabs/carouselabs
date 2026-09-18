import { MessageCircle } from "lucide-react";
import { getApiBaseUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";

// Shown by App.tsx whenever chrome.storage.local has no extensionToken yet.
// "Sign In" opens app/extension-connect in a new tab, where the user's real
// browser session does the Clerk sign-in normally (no cookie-copying) and
// the resulting token is handed back automatically — see
// src/content/authRelay.ts and src/background.ts for the rest of that
// chain. App.tsx is watching chrome.storage.onChanged, so this screen just
// disappears on its own once the token lands; no manual reload needed.
export function SignInScreen() {
  async function handleSignIn() {
    const baseUrl = await getApiBaseUrl();
    const url = `${baseUrl}/extension-connect`;
    // Left in deliberately: chrome.storage.local is scoped per Chrome
    // profile/incognito-mode AND per extension install path, so "I set
    // apiBaseUrl but it still opens production" is almost always storage
    // not actually containing what you expect in *this* context, not a
    // logic bug here — this line makes that instantly checkable.
    console.log("[CarouseLabs Comment] Sign In opening:", url);
    chrome.tabs.create({ url });
  }

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <MessageCircle className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold">Sign in to CarouseLabs</p>
        <p className="text-xs text-muted-foreground">
          Connect your account to generate AI comments from LinkedIn.
        </p>
      </div>
      <Button onClick={handleSignIn}>Sign In</Button>
    </div>
  );
}
