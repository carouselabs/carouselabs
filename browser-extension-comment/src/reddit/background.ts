// Service worker of CarouseLabs Engage for Reddit. The X extension's
// src/x/background.ts for Reddit: the side panel opens from the toolbar icon,
// Reddit tabs left without a working content script are repaired, and sign-in
// tokens from the hand-off page are stored (src/lib/signInReceiver.ts).
// Reddit chats come later, so the icon never marks one yet.
import { ensureContentScript } from "@/lib/tabs";
import { listenForSignIn } from "@/lib/signInReceiver";
import { setUpToolbarPanel } from "@/lib/panelHost";

// The side panel, or a window of its own without one (src/lib/panelHost.ts).
setUpToolbarPanel("src/reddit/sidepanel/index.html", "[CarouseLabs Engage for Reddit]");

chrome.runtime.onInstalled.addListener((details) => {
  // Only on a genuine first install, not on updates or browser restarts.
  if (details.reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("welcome-reddit.html") });
  }

  if (details.reason === "install" || details.reason === "update") healOpenRedditTabs();
});

// Reddit tabs open before an install, an update or the extension being
// switched back on have no working content script, so a Reply click in them
// would be lost until the page is reloaded. Same repair as for LinkedIn and X.
let healing: Promise<void> | null = null;

function healOpenRedditTabs(): Promise<void> {
  healing ??= chrome.tabs
    .query({ url: "https://www.reddit.com/*" })
    .then((tabs) => Promise.all(tabs.map((tab) => ensureContentScript(tab))))
    .then(() => undefined)
    .catch((err) => console.log("[background] repairing open Reddit tabs failed (non-fatal):", err))
    .finally(() => {
      healing = null;
    });
  return healing;
}

healOpenRedditTabs();

listenForSignIn();
