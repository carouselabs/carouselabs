// The service worker's half of sign-in, shared by both extensions: the
// website's hand-off page (app/extension-connect) posts a new token, this
// extension's relay (src/content/authRelay.ts) forwards it here, and it is
// stored and the hand-off tab closed. See authRelay.ts for the whole chain.
import { TOKEN_MESSAGE_TYPE } from "@/lib/platform";

// Only the sign-in hand-off page may hand the extension a token. Every
// content script (including the one on the site the extension works on) can
// reach this listener, so a token arriving from anywhere else is ignored.
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

export function listenForSignIn(): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Never log the message itself: it can be the auth token, or a captured
    // post / conversation broadcast to the side panel.
    if (!message || message.type !== TOKEN_MESSAGE_TYPE || typeof message.token !== "string") {
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
}
