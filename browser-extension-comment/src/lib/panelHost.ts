// src/lib/panelHost.ts — where the panel opens when the toolbar icon is
// clicked.
//
// Browsers with a side panel (chrome.sidePanel: Chrome, Edge, Brave, ...)
// show it there, and open it themselves on the icon's click. Browsers without
// one (Opera, Vivaldi, Arc, and older versions of the others) get the same
// page in a window of its own, beside the browser window, which is narrowed
// to make room while it's open. The page then works with the browser window
// last used, not its own (src/sidepanel/activeTab.ts).

// The panel page's address carries this when it runs in a window of its own.
export const PANEL_WINDOW_PARAM = "engageWindow";

const PANEL_WIDTH = 420;
// The browser window is narrowed only while it stays at least this wide;
// otherwise the panel window sits over its right edge.
const MIN_BROWSER_WIDTH = 640;
const PANEL_WINDOW_KEY = "panelWindow";

type Bounds = { left: number; top: number; width: number; height: number };

// The open panel window, the browser window it was opened beside, and how to
// put that window back when the panel closes (absent when it wasn't touched).
interface PanelWindowRecord {
  id: number;
  browserWindowId: number;
  narrowedWidth?: number;
  restore?: Bounds & { maximized: boolean };
}

export function hasSidePanel(): boolean {
  try {
    return typeof chrome.sidePanel?.setPanelBehavior === "function";
  } catch {
    return false;
  }
}

// In the panel page: whether it runs in a window of its own.
export function inPanelWindow(): boolean {
  try {
    return new URLSearchParams(globalThis.location?.search ?? "").has(PANEL_WINDOW_PARAM);
  } catch {
    return false;
  }
}

// Lasts as long as the browser session, as the window does. Older browsers
// without session storage fall back to local, which a later check corrects.
function store(): chrome.storage.StorageArea {
  return chrome.storage.session ?? chrome.storage.local;
}

async function panelWindowRecord(): Promise<PanelWindowRecord | null> {
  const stored = (await store().get(PANEL_WINDOW_KEY))[PANEL_WINDOW_KEY] as PanelWindowRecord | undefined;
  return typeof stored?.id === "number" ? stored : null;
}

function boundsOf(win: chrome.windows.Window | undefined): Bounds | null {
  if (!win || win.state === "fullscreen" || win.state === "minimized") return null;
  const { left, top, width, height } = win;
  if (left === undefined || top === undefined || width === undefined || height === undefined) return null;
  return { left, top, width, height };
}

// Opens the panel window beside a browser window, or brings it forward if it
// is already open.
export async function openPanelWindow(panelPath: string, browserWindowId: number | undefined): Promise<void> {
  const existing = await panelWindowRecord();
  if (existing) {
    try {
      await chrome.windows.update(existing.id, { focused: true });
      return;
    } catch {
      // Closed while the worker wasn't listening: open a new one.
    }
  }

  const browser =
    browserWindowId === undefined ? undefined : await chrome.windows.get(browserWindowId).catch(() => undefined);
  const bounds = boundsOf(browser);
  const record: Omit<PanelWindowRecord, "id"> = { browserWindowId: browser?.id ?? -1 };
  let panelBounds: Partial<Bounds> = { width: PANEL_WIDTH };

  if (browser?.id !== undefined && bounds) {
    panelBounds = { left: bounds.left + bounds.width - PANEL_WIDTH, top: bounds.top, width: PANEL_WIDTH, height: bounds.height };
    const narrowed = bounds.width - PANEL_WIDTH;
    if (narrowed >= MIN_BROWSER_WIDTH) {
      try {
        await chrome.windows.update(browser.id, { state: "normal", ...bounds, width: narrowed });
        record.narrowedWidth = narrowed;
        record.restore = { ...bounds, maximized: browser.state === "maximized" };
      } catch {
        // Left as it is: the panel sits over its right edge.
      }
    }
  }

  const url = chrome.runtime.getURL(`${panelPath}?${PANEL_WINDOW_PARAM}=1`);
  const win = await chrome.windows.create({ url, type: "popup", focused: true, ...panelBounds });
  if (win?.id !== undefined) await store().set({ [PANEL_WINDOW_KEY]: { id: win.id, ...record } });
}

// When the panel window closes: the browser window gets its size back, unless
// the person has resized it since.
export async function panelWindowClosed(windowId: number): Promise<void> {
  const record = await panelWindowRecord();
  if (!record || record.id !== windowId) return;
  await store().remove(PANEL_WINDOW_KEY);
  if (!record.restore) return;
  const browser = await chrome.windows.get(record.browserWindowId).catch(() => undefined);
  if (browser?.id === undefined || browser.width !== record.narrowedWidth) return;
  const { maximized, ...bounds } = record.restore;
  await chrome.windows.update(browser.id, maximized ? { state: "maximized" } : bounds).catch(() => {});
}

// Service worker: makes the toolbar icon open the panel, whichever kind the
// browser has. Call at the top level of the worker, so the listeners are
// there when a click wakes it.
export function setUpToolbarPanel(panelPath: string, logPrefix: string): void {
  if (hasSidePanel()) {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.error(`${logPrefix} setPanelBehavior failed:`, error));
  }

  // Fires only when the browser doesn't open a side panel on the click itself.
  chrome.action.onClicked.addListener((tab) => {
    // sidePanel.open must be called in the click itself, before any await.
    const opened =
      hasSidePanel() && typeof chrome.sidePanel.open === "function"
        ? chrome.sidePanel.open({ windowId: tab.windowId })
        : Promise.reject(new Error("no side panel"));
    opened
      .catch(() => openPanelWindow(panelPath, tab.windowId))
      .catch((error) => console.error(`${logPrefix} opening the panel failed:`, error));
  });

  chrome.windows?.onRemoved.addListener((windowId) => {
    void panelWindowClosed(windowId).catch(() => {});
  });
}
