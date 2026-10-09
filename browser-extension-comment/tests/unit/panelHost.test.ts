// Where the toolbar icon opens the panel: the browser's side panel where
// there is one (Chrome, Edge, Brave), else a window of its own beside the
// browser window (Opera, Vivaldi, Arc, older versions), which the panel then
// works with instead of its own window.
import { afterEach, describe, expect, it, vi, type Mock } from "vitest";
import { chromeMock } from "../setup/chrome";

const PANEL = "src/sidepanel/index.html";
const BROWSER_TAB = { id: 5, windowId: 1, url: "https://www.linkedin.com/feed/" } as chrome.tabs.Tab;

async function setUp() {
  vi.resetModules();
  const { setUpToolbarPanel } = await import("@/lib/panelHost");
  setUpToolbarPanel(PANEL, "[test]");
}

async function clickToolbarIcon(tab = BROWSER_TAB) {
  for (const fn of [...chromeMock().action.onClicked.listeners]) fn(tab);
  await vi.waitFor(() => expect(chromeMock().windows.create.mock.calls.length + (chromeMock().sidePanel?.open.mock.calls.length ?? 0) + chromeMock().windows.update.mock.calls.filter(([, info]) => (info as { focused?: boolean }).focused).length).toBeGreaterThan(0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function withoutSidePanel() {
  delete (chromeMock() as { sidePanel?: unknown }).sidePanel;
}

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("a browser with a side panel", () => {
  it("lets the browser open the side panel on the icon's click", async () => {
    await setUp();
    expect(chromeMock().sidePanel.setPanelBehavior).toHaveBeenCalledWith({ openPanelOnActionClick: true });
  });

  it("opens the side panel itself if the browser hands it the click anyway, and no window", async () => {
    await setUp();
    await clickToolbarIcon();
    expect(chromeMock().sidePanel.open).toHaveBeenCalledWith({ windowId: 1 });
    expect(chromeMock().windows.create).not.toHaveBeenCalled();
  });

  it("falls back to a window when the side panel won't open", async () => {
    chromeMock().sidePanel.open.mockRejectedValueOnce(new Error("No active side panel"));
    await setUp();
    await clickToolbarIcon();
    await vi.waitFor(() => expect(chromeMock().windows.create).toHaveBeenCalledTimes(1));
  });
});

describe("a browser without a side panel", () => {
  it("opens the panel in a window beside the browser window, which makes room for it", async () => {
    withoutSidePanel();
    await setUp();
    await clickToolbarIcon();
    expect(chromeMock().windows.create).toHaveBeenCalledWith({
      url: `chrome-extension://test-extension-id/${PANEL}?engageWindow=1`,
      type: "popup",
      focused: true,
      left: 980,
      top: 0,
      width: 420,
      height: 900,
    });
    expect(chromeMock().windows.update).toHaveBeenCalledWith(1, { state: "normal", left: 0, top: 0, width: 980, height: 900 });
  });

  it("brings the open panel window forward instead of opening a second", async () => {
    withoutSidePanel();
    await setUp();
    await clickToolbarIcon();
    const [panelWindow] = await Promise.all(chromeMock().windows.create.mock.results.map((r) => r.value));
    await clickToolbarIcon();
    await vi.waitFor(() => expect(chromeMock().windows.update).toHaveBeenCalledWith(panelWindow.id, { focused: true }));
    expect(chromeMock().windows.create).toHaveBeenCalledTimes(1);
  });

  it("gives the browser window its size back when the panel closes", async () => {
    withoutSidePanel();
    await setUp();
    await clickToolbarIcon();
    const [panelWindow] = await Promise.all(chromeMock().windows.create.mock.results.map((r) => r.value));
    await chromeMock().windows.remove(panelWindow.id);
    await vi.waitFor(async () => expect((await chromeMock().windows.get(1)).width).toBe(1400));
  });

  it("puts a maximized browser window back to maximized", async () => {
    withoutSidePanel();
    await chromeMock().windows.update(1, { state: "maximized" });
    await setUp();
    await clickToolbarIcon();
    const [panelWindow] = await Promise.all(chromeMock().windows.create.mock.results.map((r) => r.value));
    await chromeMock().windows.remove(panelWindow.id);
    await vi.waitFor(async () => expect((await chromeMock().windows.get(1)).state).toBe("maximized"));
  });

  it("leaves a browser window the person resized meanwhile alone", async () => {
    withoutSidePanel();
    await setUp();
    await clickToolbarIcon();
    const [panelWindow] = await Promise.all(chromeMock().windows.create.mock.results.map((r) => r.value));
    await chromeMock().windows.update(1, { width: 1100 });
    chromeMock().windows.update.mockClear();
    await chromeMock().windows.remove(panelWindow.id);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(chromeMock().windows.update).not.toHaveBeenCalled();
    expect((await chromeMock().windows.get(1)).width).toBe(1100);
  });

  it("doesn't squeeze a narrow browser window: the panel sits over its right edge", async () => {
    withoutSidePanel();
    await chromeMock().windows.update(1, { width: 900 });
    chromeMock().windows.update.mockClear();
    await setUp();
    await clickToolbarIcon();
    expect(chromeMock().windows.create).toHaveBeenCalledWith(expect.objectContaining({ left: 480, width: 420 }));
    expect(chromeMock().windows.update).not.toHaveBeenCalled();
  });

  it("the service worker starts, and a first install still opens the welcome page", async () => {
    withoutSidePanel();
    vi.resetModules();
    await import("@/background");
    const [onInstalled] = [...chromeMock().runtime.onInstalled.listeners];
    onInstalled({ reason: "install" });
    expect(chromeMock().tabs.create).toHaveBeenCalledWith({ url: "chrome-extension://test-extension-id/welcome.html" });
    expect(chromeMock().action.onClicked.listeners.size).toBe(1);
  });
});

describe("the panel in a window of its own", () => {
  it("works with the active tab of the browser window used last, not its own window", async () => {
    window.history.replaceState(null, "", "/src/sidepanel/index.html?engageWindow=1");
    (chromeMock().tabs.query as unknown as Mock).mockImplementation(async (info: chrome.tabs.QueryInfo) =>
      info.windowId === 1 && info.active ? [BROWSER_TAB] : [],
    );
    vi.resetModules();
    const { activeTab } = await import("@/sidepanel/activeTab");
    expect(await activeTab()).toEqual(BROWSER_TAB);
    expect(chromeMock().windows.getLastFocused).toHaveBeenCalledWith({ windowTypes: ["normal"] });
  });

  it("notices another browser window being brought forward", async () => {
    window.history.replaceState(null, "", "/src/sidepanel/index.html?engageWindow=1");
    vi.resetModules();
    const { onActiveTabChange } = await import("@/sidepanel/activeTab");
    const changed = vi.fn();
    const stop = onActiveTabChange(changed);
    for (const fn of [...chromeMock().windows.onFocusChanged.listeners]) fn(2);
    for (const fn of [...chromeMock().windows.onFocusChanged.listeners]) fn(-1); // focus left the browser
    expect(changed).toHaveBeenCalledTimes(1);
    stop();
    expect(chromeMock().windows.onFocusChanged.listeners.size).toBe(0);
  });

  it("in a side panel, keeps using its own window", async () => {
    (chromeMock().tabs.query as unknown as Mock).mockImplementation(async (info: chrome.tabs.QueryInfo) =>
      info.currentWindow && info.active ? [BROWSER_TAB] : [],
    );
    vi.resetModules();
    const { activeTab } = await import("@/sidepanel/activeTab");
    expect(await activeTab()).toEqual(BROWSER_TAB);
    expect(chromeMock().windows.getLastFocused).not.toHaveBeenCalled();
  });
});
