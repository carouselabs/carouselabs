// Service worker of CarouseLabs Engage for X. The LinkedIn extension's
// src/background.ts, minus the keyboard shortcut: the side panel opens from
// the toolbar icon, X tabs left without a working content script are repaired,
// the icon says "AI" on an X chat (src/lib/conversationBadge.ts), and sign-in
// tokens from the hand-off page are stored (src/lib/signInReceiver.ts).
import { ensureContentScript } from "@/lib/tabs";
import { listenForSignIn } from "@/lib/signInReceiver";
import { markConversationTabs } from "@/lib/conversationBadge";
import { setUpToolbarPanel } from "@/lib/panelHost";

// The side panel, or a window of its own without one (src/lib/panelHost.ts).
setUpToolbarPanel("src/x/sidepanel/index.html", "[CarouseLabs Engage for X]");

chrome.runtime.onInstalled.addListener((details) => {
  // Only on a genuine first install, not on updates or browser restarts.
  if (details.reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("welcome-x.html") });
  }

  if (details.reason === "install" || details.reason === "update") healOpenXTabs();
});

// X tabs open before an install, an update or the extension being switched
// back on have no working content script, so a Reply click in them would be
// lost until the page is reloaded. Same repair as for LinkedIn.
let healing: Promise<void> | null = null;

function healOpenXTabs(): Promise<void> {
  healing ??= chrome.tabs
    .query({ url: "https://x.com/*" })
    .then((tabs) => Promise.all(tabs.map((tab) => ensureContentScript(tab))))
    .then(() => undefined)
    .catch((err) => console.log("[background] repairing open X tabs failed (non-fatal):", err))
    .finally(() => {
      healing = null;
    });
  return healing;
}

healOpenXTabs();

markConversationTabs("https://x.com/i/chat/*");

listenForSignIn();
