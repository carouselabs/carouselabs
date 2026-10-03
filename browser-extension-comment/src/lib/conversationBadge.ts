// The toolbar icon shows "AI" while a conversation is open in a tab (a
// LinkedIn conversation, or an X chat in the X extension: see
// conversationPath in src/lib/tabs.ts), so the Messages help gets noticed even
// with the panel closed (clicking the icon opens the panel, which offers it).
// Only the tab's address is checked, which the site's host permission allows;
// the page isn't read. Other sites' addresses aren't visible to the extension
// at all, so leaving the site arrives as a load with no address, and that
// clears the badge. Used by both service workers.
import { conversationPath } from "@/lib/tabs";

const CONVERSATION_BADGE = "AI";
const CONVERSATION_TITLE = "Get AI help replying to this conversation";

function markConversationTab(tabId: number, url: string | undefined, defaultTitle: string) {
  const open = conversationPath(url) !== null;
  chrome.action.setBadgeText({ tabId, text: open ? CONVERSATION_BADGE : "" }).catch(() => {});
  chrome.action.setTitle({ tabId, title: open ? CONVERSATION_TITLE : defaultTitle }).catch(() => {});
}

// `openPattern`: the tabs to mark at start-up (conversations already open
// after an install, update or browser restart, which won't navigate again).
export function markConversationTabs(openPattern: string): void {
  const defaultTitle = chrome.runtime.getManifest().action?.default_title ?? "CarouseLabs Engage";

  chrome.action.setBadgeBackgroundColor({ color: "#7C3AED" }).catch(() => {});
  chrome.action.setBadgeTextColor?.({ color: "#FFFFFF" })?.catch(() => {});

  chrome.tabs.onUpdated.addListener((tabId, change, tab) => {
    if (change.url !== undefined || change.status === "loading") markConversationTab(tabId, tab.url, defaultTitle);
  });

  chrome.tabs
    .query({ url: openPattern })
    .then((tabs) => tabs.forEach((tab) => tab.id !== undefined && markConversationTab(tab.id, tab.url, defaultTitle)))
    .catch(() => {});
}
