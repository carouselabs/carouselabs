import { useEffect, useState } from "react";
import { isSiteTab } from "@/lib/tabs";

// Whether this window's active tab is on the extension's site (LinkedIn, or X
// in the X extension), following tab switches and navigation; null until the
// first check. Only the address is looked at, and other sites' addresses
// aren't visible to the extension at all, so any other site reads as false.
export function useOnSite(): boolean | null {
  const [onSite, setOnSite] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!cancelled) setOnSite(isSiteTab(tab));
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

  return onSite;
}
