// src/lib/tabs.ts — side panel ↔ LinkedIn tab messaging helpers.

// chrome.tabs.sendMessage throws when the tab has no content script. That
// happens on non-LinkedIn pages — and on LinkedIn tabs that were already open
// when the extension was installed or updated, because Chrome does not
// re-inject into existing tabs. The second case needs a different answer
// than "open LinkedIn", which the user already has.
export function noContentScriptMessage(tab: chrome.tabs.Tab | undefined, notOnLinkedIn: string): string {
  return tab?.url?.startsWith("https://www.linkedin.com/")
    ? "This LinkedIn tab needs a reload (the extension was updated). Reload the page, then try again."
    : notOnLinkedIn;
}
