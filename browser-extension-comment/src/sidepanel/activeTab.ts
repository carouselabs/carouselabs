// The tab the panel works with: the active tab of the browser window it
// serves. In a side panel that is the panel's own window. In a window of its
// own (browsers without a side panel, src/lib/panelHost.ts), it is the
// browser window used last, since the panel's own window holds only itself.
import { inPanelWindow } from "@/lib/panelHost";

// The browser window the panel serves, or undefined for its own (the side
// panel case, and the fallback when no browser window is left).
export async function servedWindowId(): Promise<number | undefined> {
  if (!inPanelWindow()) return undefined;
  try {
    return (await chrome.windows.getLastFocused({ windowTypes: ["normal"] })).id;
  } catch {
    return undefined;
  }
}

export async function activeTab(): Promise<chrome.tabs.Tab | undefined> {
  const windowId = await servedWindowId();
  const [tab] = await chrome.tabs.query(
    windowId === undefined ? { active: true, currentWindow: true } : { active: true, windowId },
  );
  return tab;
}

// Calls back whenever the active tab may have changed: a tab switch, a page
// loading or changing address, or (for a panel in a window of its own)
// another browser window being brought forward. Returns the unsubscribe.
export function onActiveTabChange(callback: () => void): () => void {
  const onActivated = () => callback();
  const onUpdated = (_tabId: number, change: chrome.tabs.TabChangeInfo) => {
    if (change.url !== undefined || change.status === "complete") callback();
  };
  const onFocusChanged = (windowId: number) => {
    if (windowId !== chrome.windows.WINDOW_ID_NONE) callback();
  };
  const watchFocus = inPanelWindow() && Boolean(chrome.windows?.onFocusChanged);

  chrome.tabs.onActivated.addListener(onActivated);
  chrome.tabs.onUpdated.addListener(onUpdated);
  if (watchFocus) chrome.windows.onFocusChanged.addListener(onFocusChanged);
  return () => {
    chrome.tabs.onActivated.removeListener(onActivated);
    chrome.tabs.onUpdated.removeListener(onUpdated);
    if (watchFocus) chrome.windows.onFocusChanged.removeListener(onFocusChanged);
  };
}
