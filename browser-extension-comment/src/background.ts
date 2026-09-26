// Service worker. Registers the side panel's open-on-click behavior, and
// receives the extension token relayed by src/content/authRelay.ts (see
// that file's comment for the full hand-off chain) — stores it in
// chrome.storage.local and closes the connect tab it came from.

// Must match MESSAGE_TYPE in both app/extension-connect and
// src/content/authRelay.ts exactly — no shared package between this repo
// and the web app's, so it's a literal by necessity.
const MESSAGE_TYPE = "carouselabs:extension-token";

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

chrome.runtime.onInstalled.addListener((details) => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error("[CarouseLabs Comment] setPanelBehavior failed:", error));

  // Only on a genuine first install: an update or a browser restart also fires
  // this listener, and reopening the welcome tab then would be noise.
  // chrome.sidePanel.open() cannot be called here (it needs a user gesture),
  // so the page explains how to pin the toolbar icon instead.
  if (details.reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
  }

  console.log("[CarouseLabs Comment] service worker installed.");
});

// Only the sign-in hand-off page may hand the extension a token. Every
// content script (including the one on linkedin.com) can reach this
// listener, so a token arriving from anywhere else is ignored.
const TOKEN_ORIGINS = [
  "https://carouselabs.com",
  ...(import.meta.env.MODE !== "production" ? ["http://localhost:3000"] : []),
];

function isSignInPage(sender: chrome.runtime.MessageSender): boolean {
  try {
    const url = new URL(sender.url ?? sender.tab?.url ?? "");
    return TOKEN_ORIGINS.includes(url.origin) && url.pathname.startsWith("/extension-connect");
  } catch {
    return false;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Never log the message itself: it can be the auth token, or a captured
  // post / conversation broadcast to the side panel.
  if (!message || message.type !== MESSAGE_TYPE || typeof message.token !== "string") {
    return; // not our message — don't keep the channel open for it
  }
  if (!isSignInPage(sender)) {
    console.warn("[background] ignored a sign-in token from outside the sign-in page");
    return;
  }

  chrome.storage.local
    .set({ extensionToken: message.token })
    .then(() => {
      console.log("[background] signed in.");
      sendResponse({ ok: true });

      if (sender.tab?.id !== undefined) {
        chrome.tabs.remove(sender.tab.id).catch((err) => {
          console.log("[background] chrome.tabs.remove failed (non-fatal):", err);
        });
      }
    })
    .catch((err) => {
      console.log("[background] chrome.storage.local.set FAILED:", err);
      sendResponse({ ok: false, error: String(err) });
    });

  return true; // keep the message channel open for the async sendResponse above
});
