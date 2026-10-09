import { useEffect, useState } from "react";
import { conversationPath } from "@/lib/tabs";
import { activeTab, onActiveTabChange } from "./activeTab";

// The LinkedIn conversation open in the active tab the panel works with, as
// its thread path, or null. Follows tab switches and navigation, including
// LinkedIn moving between conversations without loading a new page (the
// address still changes). Only the address is looked at, never the page.
export function useOpenConversation(): string | null {
  const [path, setPath] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const tab = await activeTab();
        if (!cancelled) setPath(conversationPath(tab?.url));
      } catch {
        // The panel is closing; nothing to update.
      }
    }

    void refresh();
    const stop = onActiveTabChange(() => void refresh());
    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  return path;
}
