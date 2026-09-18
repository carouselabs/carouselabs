// src/content/authRelay.ts — injected only into
// https://carouselabs.com/extension-connect and its localhost dev
// equivalent (see manifest.config.ts's content_scripts). A plain web page
// has no direct access to chrome.runtime, so this content script is the
// bridge: it listens for the one-time postMessage that
// app/extension-connect/page.tsx's ExtensionConnectClient sends after
// exchanging the user's Clerk session for an extension token, and relays it
// into the extension via chrome.runtime.sendMessage (which src/background.ts
// picks up and stores). Nothing here touches cookies/localStorage, and the
// token is never read from a URL.

// Must match MESSAGE_TYPE in both app/extension-connect and
// src/background.ts exactly — no shared package between this repo and the
// web app's, so it's a literal by necessity.
const MESSAGE_TYPE = "carouselabs:extension-token";

// Runs unconditionally the moment this content script is injected — if this
// never appears in the PAGE's console (not the extension's service worker
// console), the content script isn't being injected at all (manifest
// matches / reload-after-manifest-change issue), independent of anything
// about the message itself.
console.log("[authRelay] content script loaded on", window.location.href);

window.addEventListener("message", (event) => {
  console.log("[authRelay] message event received. origin:", event.origin, "source === window:", event.source === window);

  if (event.source !== window) return; // ignore iframes / other windows
  if (event.origin !== window.location.origin) {
    console.log(
      "[authRelay] rejected — origin mismatch. event.origin:",
      event.origin,
      "window.location.origin:",
      window.location.origin,
    );
    return;
  }

  const data = event.data as unknown;
  if (
    !data ||
    typeof data !== "object" ||
    (data as Record<string, unknown>).type !== MESSAGE_TYPE ||
    typeof (data as Record<string, unknown>).token !== "string"
  ) {
    console.log("[authRelay] message received but shape didn't match, ignoring:", data);
    return;
  }

  const token = (data as { token: string }).token;
  console.log("[authRelay] relaying token to background, starts with:", token.slice(0, 8) + "…");

  chrome.runtime.sendMessage({ type: MESSAGE_TYPE, token }, (response) => {
    if (chrome.runtime.lastError) {
      console.log("[authRelay] sendMessage error:", chrome.runtime.lastError.message);
    } else {
      console.log("[authRelay] sendMessage delivered, response:", response);
    }
  });
});
