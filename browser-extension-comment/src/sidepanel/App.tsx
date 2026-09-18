import { useEffect, useState } from "react";
import { Header } from "./components/Header";
import { IconBar } from "./components/IconBar";
import { SignInScreen } from "./components/SignInScreen";
import { HomeScreen } from "./components/screens/HomeScreen";
import { ProfilesScreen } from "./components/screens/ProfilesScreen";
import { HistoryScreen } from "./components/screens/HistoryScreen";
import { SettingsScreen } from "./components/screens/SettingsScreen";
import { AccountScreen } from "./components/screens/AccountScreen";
import type { Screen } from "./types";

function renderScreen(screen: Screen) {
  switch (screen) {
    case "home":
      return <HomeScreen />;
    case "profiles":
      return <ProfilesScreen />;
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

  if (signedIn === null) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!signedIn) {
    return <SignInScreen />;
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-background">
      <Header />
      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 overflow-y-auto">{renderScreen(activeScreen)}</main>
        <IconBar activeScreen={activeScreen} onSelect={setActiveScreen} />
      </div>
    </div>
  );
}
