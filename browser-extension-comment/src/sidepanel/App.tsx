import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Header } from "./components/Header";
import { IconBar } from "./components/IconBar";
import { SignInScreen } from "./components/SignInScreen";
import { HomeScreen } from "./components/screens/HomeScreen";
import { MessagesScreen } from "./components/screens/MessagesScreen";
import { ProfilesScreen } from "./components/screens/ProfilesScreen";
import { HistoryScreen } from "./components/screens/HistoryScreen";
import { SettingsScreen } from "./components/screens/SettingsScreen";
import { AccountScreen } from "./components/screens/AccountScreen";
import { Onboarding, ONBOARDING_DONE_STORAGE_KEY } from "./components/Onboarding";
import { CaptureToast } from "./components/CaptureToast";
import { ConversationHint } from "./components/ConversationHint";
import { SiteBlockedNotice, useSiteBlocked } from "./components/SiteBlockedNotice";
import { useOpenConversation } from "./useOpenConversation";
import type { Screen } from "./types";
import type { ProfileKind } from "./components/screens/ProfilesScreen";

function renderScreen(
  screen: Screen,
  openProfileBuilder: ProfileKind | null,
  onBuilderOpened: () => void,
  onCreateProfile: (kind: ProfileKind) => void,
  messages: { readOnOpen: boolean; openConversation: string | null },
) {
  switch (screen) {
    case "home":
      return <HomeScreen onCreateProfile={onCreateProfile} />;
    case "messages":
      return (
        <MessagesScreen
          onCreateProfile={() => onCreateProfile("message")}
          onCreateAgent={() => onCreateProfile("agent")}
          readOnOpen={messages.readOnOpen}
          openConversation={messages.openConversation}
        />
      );
    case "profiles":
      return <ProfilesScreen startInBuilder={openProfileBuilder} onBuilderOpened={onBuilderOpened} />;
    case "history":
      return <HistoryScreen />;
    case "settings":
      return <SettingsScreen />;
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
  // null = still reading the flag; true = onboarding not yet completed here.
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);
  // Set when onboarding ends on "Create my profile now", so the Profiles
  // screen opens straight into the builder instead of its list.
  const [openProfileBuilder, setOpenProfileBuilder] = useState<ProfileKind | null>(null);
  // A LinkedIn conversation open in the tab beside the panel (its thread
  // path), so the panel can point people to Messages, which many never find.
  const openConversation = useOpenConversation();
  // Conversations whose hint got "Not now", until the panel is closed.
  const [dismissedHints, setDismissedHints] = useState<string[]>([]);
  // Set by the hint's button: Messages reads the conversation as it opens.
  const [readOnOpen, setReadOnOpen] = useState(false);
  // The browser blocking extensions on LinkedIn (the person's site setting):
  // nothing reaches the page until they undo it, so the panel says how.
  const siteBlocked = useSiteBlocked();

  useEffect(() => {
    chrome.storage.local.get("extensionToken").then(({ extensionToken }) => {
      setSignedIn(hasToken(extensionToken));
    });

    // src/background.ts writes extensionToken the moment the Sign In flow
    // completes (see SignInScreen.tsx) — watching for that means this
    // screen flips to the signed-in app automatically, no manual reload.
    function handleChange(changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) {
      if (areaName !== "local" || !("extensionToken" in changes)) return;
      setSignedIn(hasToken(changes.extensionToken.newValue));
    }

    chrome.storage.onChanged.addListener(handleChange);
    return () => chrome.storage.onChanged.removeListener(handleChange);
  }, []);

  useEffect(() => {
    chrome.storage.local.get(ONBOARDING_DONE_STORAGE_KEY).then((stored) => {
      setNeedsOnboarding(stored[ONBOARDING_DONE_STORAGE_KEY] !== true);
    });
  }, []);

  // Single entry point for "open the Profile Builder", shared by onboarding's
  // "Create my profile now" and the Home dropdown's "+ Create custom profile".
  function goToProfileBuilder(kind: ProfileKind = "comment") {
    setOpenProfileBuilder(kind);
    selectScreen("profiles");
  }

  function selectScreen(screen: Screen) {
    setReadOnOpen(false);
    setActiveScreen(screen);
  }

  function writeReplyWithAI() {
    setReadOnOpen(true);
    setActiveScreen("messages");
  }

  // Usually gone within a frame (two storage reads), so just the brand mark,
  // not a spinner that would flash.
  if (signedIn === null || needsOnboarding === null) {
    return (
      <div role="status" className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex h-10 w-10 animate-soft-pulse items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <MessageCircle aria-hidden className="h-5 w-5" />
        </div>
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  if (!signedIn) {
    return <SignInScreen />;
  }

  // Runs after sign-in, not before: the intro cards talk about profiles and
  // generating, which mean nothing to someone who has not signed in yet. The
  // storage listener above flips signedIn the moment the token lands, so this
  // appears on its own with no refresh.
  if (needsOnboarding) {
    return (
      <div className="flex h-screen w-screen flex-col bg-background">
        <Header />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <Onboarding
            onCreateProfile={() => goToProfileBuilder("comment")}
            onFinish={() => setNeedsOnboarding(false)}
          />
        </main>
      </div>
    );
  }

  const showHint =
    openConversation !== null && activeScreen !== "messages" && !dismissedHints.includes(openConversation);

  return (
    <div className="relative flex h-screen w-screen flex-col bg-background">
      <CaptureToast />
      <Header />
      <div className="flex min-h-0 flex-1">
        {/* Keyed by screen: a switch starts the new screen at the top with a
            short fade, instead of at the old screen's scroll position. */}
        <main key={activeScreen} className="min-w-0 flex-1 animate-fade-in overflow-y-auto">
          {siteBlocked.blocked && (
            <div className="px-4 pt-4">
              <SiteBlockedNotice checking={siteBlocked.checking} onCheck={siteBlocked.check} />
            </div>
          )}
          {showHint && (
            <div className="px-4 pt-4">
              <ConversationHint
                onWrite={writeReplyWithAI}
                onDismiss={() => {
                  if (openConversation) setDismissedHints((paths) => [...paths, openConversation]);
                }}
              />
            </div>
          )}
          {renderScreen(
            activeScreen,
            openProfileBuilder,
            () => setOpenProfileBuilder(null),
            goToProfileBuilder,
            { readOnOpen, openConversation },
          )}
        </main>
        <IconBar
          activeScreen={activeScreen}
          onSelect={selectScreen}
          attention={
            openConversation ? { screen: "messages", description: "A LinkedIn conversation is open: get AI help replying." } : null
          }
        />
      </div>
    </div>
  );
}
