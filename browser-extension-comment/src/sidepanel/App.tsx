import { useEffect, useState } from "react";
import { Header } from "./components/Header";
import { IconBar } from "./components/IconBar";
import { SignInScreen } from "./components/SignInScreen";
import { HomeScreen } from "./components/screens/HomeScreen";
import { ProfilesScreen } from "./components/screens/ProfilesScreen";
import { HistoryScreen } from "./components/screens/HistoryScreen";
import { SettingsScreen } from "./components/screens/SettingsScreen";
import { AccountScreen } from "./components/screens/AccountScreen";
import { Onboarding, ONBOARDING_DONE_STORAGE_KEY } from "./components/Onboarding";
import { CaptureToast } from "./components/CaptureToast";
import type { Screen } from "./types";
import type { ProfileKind } from "./components/screens/ProfilesScreen";

function renderScreen(
  screen: Screen,
  openProfileBuilder: ProfileKind | null,
  onBuilderOpened: () => void,
  onCreateProfile: (kind: ProfileKind) => void,
) {
  switch (screen) {
    case "home":
      return <HomeScreen onCreateProfile={onCreateProfile} />;
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
    setActiveScreen("profiles");
  }

  if (signedIn === null || needsOnboarding === null) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Loading…
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
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Onboarding
            onCreateProfile={() => goToProfileBuilder("comment")}
            onFinish={() => setNeedsOnboarding(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen w-screen flex-col bg-background">
      <CaptureToast />
      <Header />
      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 overflow-y-auto">
          {renderScreen(
            activeScreen,
            openProfileBuilder,
            () => setOpenProfileBuilder(null),
            goToProfileBuilder,
          )}
        </main>
        <IconBar activeScreen={activeScreen} onSelect={setActiveScreen} />
      </div>
    </div>
  );
}
