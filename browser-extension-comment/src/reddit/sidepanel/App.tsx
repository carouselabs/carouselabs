import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Header } from "@/sidepanel/components/Header";
import { IconBar } from "@/sidepanel/components/IconBar";
import { SignInScreen } from "@/sidepanel/components/SignInScreen";
import { AccountScreen } from "@/sidepanel/components/screens/AccountScreen";
import { HistoryScreen } from "@/sidepanel/components/screens/HistoryScreen";
import { SiteBlockedNotice, useSiteBlocked } from "@/sidepanel/components/SiteBlockedNotice";
import type { Screen } from "@/sidepanel/types";
import { RedditHomeScreen } from "./screens/RedditHomeScreen";

// The Reddit extension's panel: the LinkedIn panel's shell (header, screen
// bar, sign-in, account) with Reddit's own Home. History is the shared
// screen, reading Reddit's history rows. Profiles, Settings and Messages
// (Reddit chats) come in later releases, so the bar shows only what works.
const SCREENS: Screen[] = ["home", "history", "account"];

function renderScreen(screen: Screen) {
  switch (screen) {
    case "history":
      return <HistoryScreen />;
    case "account":
      return <AccountScreen />;
    default:
      return <RedditHomeScreen />;
  }
}

function hasToken(value: unknown): boolean {
  return typeof value === "string" && value.length > 0;
}

export default function App() {
  const [activeScreen, setActiveScreen] = useState<Screen>("home");
  // null = still checking chrome.storage.local on first mount
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  // The browser blocking extensions on Reddit (see the LinkedIn App).
  const siteBlocked = useSiteBlocked();

  useEffect(() => {
    chrome.storage.local.get("extensionToken").then(({ extensionToken }) => {
      setSignedIn(hasToken(extensionToken));
    });

    // The service worker stores the token when sign-in completes; watching for
    // it flips this panel to the signed-in app with no reload.
    function handleChange(changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) {
      if (areaName !== "local" || !("extensionToken" in changes)) return;
      setSignedIn(hasToken(changes.extensionToken.newValue));
    }

    chrome.storage.onChanged.addListener(handleChange);
    return () => chrome.storage.onChanged.removeListener(handleChange);
  }, []);

  if (signedIn === null) {
    return (
      <div role="status" className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex h-10 w-10 animate-soft-pulse items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <MessageCircle aria-hidden className="h-5 w-5" />
        </div>
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  if (!signedIn) return <SignInScreen />;

  return (
    <div className="relative flex h-screen w-screen flex-col bg-background">
      <Header />
      <div className="flex min-h-0 flex-1">
        <main key={activeScreen} className="min-w-0 flex-1 animate-fade-in overflow-y-auto">
          {siteBlocked.blocked && (
            <div className="px-4 pt-4">
              <SiteBlockedNotice checking={siteBlocked.checking} onCheck={siteBlocked.check} />
            </div>
          )}
          {renderScreen(activeScreen)}
        </main>
        <IconBar activeScreen={activeScreen} onSelect={setActiveScreen} screens={SCREENS} />
      </div>
    </div>
  );
}
