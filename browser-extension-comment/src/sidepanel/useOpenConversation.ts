import { useEffect, useState } from "react";
import { conversationPath } from "@/lib/tabs";

// The LinkedIn conversation open in this window's active tab, as its thread
// path, or null. Follows tab switches and navigation, including LinkedIn
// moving between conversations without loading a new page (the address still
// changes). Only the address is looked at, never the page.
export function useOpenConversation(): string | null {
  const [path, setPath] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!cancelled) setPath(conversationPath(tab?.url));
      } catch {
        // The panel is closing; nothing to update.
      }
    }

    const onActivated = () => void refresh();
    const onUpdated = (_tabId: number, change: chrome.tabs.TabChangeInfo) => {
      if (change.url !== undefined || change.status === "complete") void refresh();
    };

    void refresh();
    chrome.tabs.onActivated.addListener(onActivated);
    chrome.tabs.onUpdated.addListener(onUpdated);
    return () => {
      cancelled = true;
      chrome.tabs.onActivated.removeListener(onActivated);
      chrome.tabs.onUpdated.removeListener(onUpdated);
    };
  }, []);

  return path;
}
