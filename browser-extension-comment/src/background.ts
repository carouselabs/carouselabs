// Service worker. Registers the side panel's open-on-click behavior, and
// receives the extension token relayed by src/content/authRelay.ts (see
// that file's comment for the full hand-off chain) — stores it in
// chrome.storage.local and closes the connect tab it came from.

// Must match MESSAGE_TYPE in both app/extension-connect and
// src/content/authRelay.ts exactly — no shared package between this repo
// and the web app's, so it's a literal by necessity.
const MESSAGE_TYPE = "carouselabs:extension-token";

console.log("[background] service worker script evaluated, registering listeners.");

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error("[CarouseLabs Comment] setPanelBehavior failed:", error));

  console.log("[CarouseLabs Comment] service worker installed.");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[background] onMessage fired. message:", message, "sender.tab?.id:", sender.tab?.id);

  if (!message || message.type !== MESSAGE_TYPE || typeof message.token !== "string") {
    console.log("[background] message shape didn't match, ignoring.");
    return; // not our message — don't keep the channel open for it
  }

  console.log("[background] storing extensionToken, starts with:", message.token.slice(0, 8) + "…");

  chrome.storage.local
    .set({ extensionToken: message.token })
    .then(() => {
      console.log("[background] chrome.storage.local.set resolved.");
      return chrome.storage.local.get("extensionToken");
    })
    .then((stored) => {
      console.log("[background] read-back confirms stored value present:", typeof stored.extensionToken === "string");
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
