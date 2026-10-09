// Service worker. Registers the side panel's open-on-click behavior, repairs
// LinkedIn tabs left without a working content script (see
// healOpenLinkedInTabs), marks the toolbar icon on LinkedIn conversations (see
// markConversationTab), and
// receives the extension token relayed by src/content/authRelay.ts (see
// that file's comment for the full hand-off chain) — stores it in
// chrome.storage.local and closes the connect tab it came from.
import { ensureContentScript } from "@/lib/tabs";
import { markConversationTabs } from "@/lib/conversationBadge";
import { listenForSignIn } from "@/lib/signInReceiver";
import { setUpToolbarPanel } from "@/lib/panelHost";

// Must match GENERATE_SHORTCUT_MESSAGE_TYPE in HomeScreen.tsx. The keyboard
// shortcut is registered in manifest.config.ts and fires here, in the service
// worker, rather than in the side panel — which is what makes it work while
// the LinkedIn page has focus rather than only when the panel does.
const GENERATE_SHORTCUT_MESSAGE_TYPE = "carouselabs:shortcut-generate";

chrome.commands.onCommand.addListener((command) => {
  if (command !== "generate-comment") return;

  // Delivered only if the side panel is open. Nothing opens it here: that
  // would need a user-gesture path and would surprise someone who pressed the
  // shortcut by accident.
  chrome.runtime.sendMessage({ type: GENERATE_SHORTCUT_MESSAGE_TYPE }, () => {
    if (chrome.runtime.lastError) {
      console.log("[background] generate shortcut had no receiver (side panel closed)");
    }
  });
});

console.log("[background] service worker script evaluated, registering listeners.");

// The toolbar icon opens the panel: the browser's side panel, or a window of
// its own in browsers without one (src/lib/panelHost.ts).
setUpToolbarPanel("src/sidepanel/index.html", "[CarouseLabs Engage]");

chrome.runtime.onInstalled.addListener((details) => {
  // Only on a genuine first install: an update or a browser restart also fires
  // this listener, and reopening the welcome tab then would be noise.
  // chrome.sidePanel.open() cannot be called here (it needs a user gesture),
  // so the page explains how to pin the toolbar icon instead.
  if (details.reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
  }

  if (details.reason === "install" || details.reason === "update") healOpenLinkedInTabs();

  console.log("[CarouseLabs Engage] service worker installed.");
});

// LinkedIn tabs open before an install, an update, or the extension being
// turned back on have no working content script (Chrome only injects into
// pages loaded afterwards), so every Comment click in them would be lost until
// the user reloads. So each LinkedIn tab whose script doesn't answer gets a
// fresh one: whenever this worker starts (which covers all three, including a
// re-enable, which fires no onInstalled) and again on install/update. A tab
// that answers is left alone, so a healthy tab costs one message. Discarded
// tabs are skipped: they reload, and get the script, when they're next opened.
let healing: Promise<void> | null = null;

function healOpenLinkedInTabs(): Promise<void> {
  healing ??= chrome.tabs
    .query({ url: "https://www.linkedin.com/*" })
    .then((tabs) => Promise.all(tabs.map((tab) => ensureContentScript(tab))))
    .then(() => undefined)
    .catch((err) => console.log("[background] repairing open LinkedIn tabs failed (non-fatal):", err))
    .finally(() => {
      healing = null;
    });
  return healing;
}

healOpenLinkedInTabs();

markConversationTabs("https://www.linkedin.com/messaging/thread/*");

listenForSignIn();
