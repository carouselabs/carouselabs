import { useCallback, useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Header } from "@/sidepanel/components/Header";
import { IconBar } from "@/sidepanel/components/IconBar";
import { SignInScreen } from "@/sidepanel/components/SignInScreen";
import { AccountScreen } from "@/sidepanel/components/screens/AccountScreen";
import { MessagesScreen } from "@/sidepanel/components/screens/MessagesScreen";
import { HistoryScreen } from "@/sidepanel/components/screens/HistoryScreen";
import { ConversationHint } from "@/sidepanel/components/ConversationHint";
import { SiteBlockedNotice, useSiteBlocked } from "@/sidepanel/components/SiteBlockedNotice";
import { useOpenConversation } from "@/sidepanel/useOpenConversation";
import type { Screen } from "@/sidepanel/types";
import { XHomeScreen } from "./screens/XHomeScreen";
import { XProfilesScreen, type XProfileKind } from "./screens/XProfilesScreen";
import { XSettingsScreen } from "./screens/XSettingsScreen";

// The X extension's panel: the LinkedIn panel's shell (header, screen bar,
// sign-in, account) with X's own screens. Messages and History are the
// LinkedIn screens, reading X chats (src/sidepanel/messagesSite.ts) and X's
// history rows.
function renderScreen(
  screen: Screen,
  openProfileBuilder: XProfileKind | null,
  onBuilderOpened: () => void,
  onCreateProfile: (kind: XProfileKind) => void,
  messages: { readOnOpen: boolean; openConversation: string | null },
) {
  switch (screen) {
    case "home":
      return <XHomeScreen onCreateProfile={() => onCreateProfile("replies")} />;
    case "messages":
      return (
        <MessagesScreen
          onCreateProfile={() => onCreateProfile("messages")}
          readOnOpen={messages.readOnOpen}
          openConversation={messages.openConversation}
        />
      );
    case "profiles":
      return <XProfilesScreen startInBuilder={openProfileBuilder} onBuilderOpened={onBuilderOpened} />;
    case "history":
      return <HistoryScreen />;
    case "settings":
      return <XSettingsScreen />;
    case "account":
      return <AccountScreen />;
  }
}

function hasToken(value: unknown): boolean {
  return typeof value === "string" && value.length > 0;
}

export default function App() {
  const [activeScreen, setActiveScreen] = useState<Screen>("home");
  // null = still checking chrome.storage.local on first mount
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  // An X chat open in the tab beside the panel, so the panel can point to
  // Messages (src/sidepanel/useOpenConversation.ts).
  const openConversation = useOpenConversation();
  // The browser blocking extensions on X (see the LinkedIn App).
  const siteBlocked = useSiteBlocked();
  const [dismissedHints, setDismissedHints] = useState<string[]>([]);
  const [readOnOpen, setReadOnOpen] = useState(false);
  // "+ Create custom profile" on Home or Messages: Profiles opens straight
  // into that kind's builder, once.
  const [openProfileBuilder, setOpenProfileBuilder] = useState<XProfileKind | null>(null);
  const builderOpened = useCallback(() => setOpenProfileBuilder(null), []);

  function selectScreen(screen: Screen) {
    setReadOnOpen(false);
    setActiveScreen(screen);
  }

  function createProfile(kind: XProfileKind) {
    setOpenProfileBuilder(kind);
    selectScreen("profiles");
  }

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

  const showHint =
    openConversation !== null && activeScreen !== "messages" && !dismissedHints.includes(openConversation);

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
          {showHint && (
            <div className="px-4 pt-4">
              <ConversationHint
                onWrite={() => {
                  setReadOnOpen(true);
                  setActiveScreen("messages");
                }}
                onDismiss={() => {
                  if (openConversation) setDismissedHints((paths) => [...paths, openConversation]);
                }}
              />
            </div>
          )}
          {renderScreen(activeScreen, openProfileBuilder, builderOpened, createProfile, { readOnOpen, openConversation })}
        </main>
        <IconBar
          activeScreen={activeScreen}
          onSelect={selectScreen}
          attention={
            openConversation ? { screen: "messages", description: "An X chat is open: get AI help replying." } : null
          }
        />
      </div>
    </div>
  );
}
