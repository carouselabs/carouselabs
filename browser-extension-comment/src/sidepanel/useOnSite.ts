import { useEffect, useState } from "react";
import { isSiteTab } from "@/lib/tabs";
import { activeTab, onActiveTabChange } from "./activeTab";

// Whether the active tab the panel works with is on the extension's site
// (LinkedIn, or X in the X extension), following tab switches and navigation;
// null until the first check. Only the address is looked at, and other sites'
// addresses aren't visible to the extension at all, so any other site reads
// as false.
export function useOnSite(): boolean | null {
  const [onSite, setOnSite] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const tab = await activeTab();
        if (!cancelled) setOnSite(isSiteTab(tab));
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

  return onSite;
}
