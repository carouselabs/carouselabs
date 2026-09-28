// LinkedIn tabs that were open before the extension was installed or updated
// have no working content script. The extension puts one in itself, from the
// service worker on install/update and from the side panel on demand
// (src/lib/tabs.ts), and a fresh copy replaces any older one in the tab (the
// takeover at the bottom of src/content-script.ts), so the user never has to
// reload and a click is never handled twice.
import { describe, expect, it, vi, type Mock } from "vitest";
import { chromeMock } from "../setup/chrome";
import { byFixture, click, importContentScript, loadFixture, sendToContentScript, SERVER_CONFIG, storedPost } from "./helpers";
import { ensureContentScript, noContentScriptMessage, PING_MESSAGE_TYPE, sendToTab } from "@/lib/tabs";

const LINKEDIN_TAB = { id: 5, url: "https://www.linkedin.com/feed/" } as chrome.tabs.Tab;
const OTHER_TAB = { id: 6, url: "https://example.com/" } as chrome.tabs.Tab;
const LOADER = "assets/content-script.ts-loader.js";
const NO_RECEIVER = "Could not establish connection. Receiving end does not exist.";

// The module behind the loader, imported under a URL of its own each time
// (see the mock manifest in tests/setup/chrome.ts).
const freshImportOf = (tabId: number) => ({
  target: { tabId },
  func: expect.any(Function),
  args: [expect.stringMatching(/^chrome-extension:\/\/test-extension-id\/assets\/content-script\.ts-abc123\.js\?injected=\d+$/)],
});

// Tabs whose content script only exists once executeScript has run on them,
// like LinkedIn tabs left over from before an update. `injected` is per tab.
function tabWithoutContentScript() {
  const chrome = chromeMock();
  const injected = new Set<number>();
  (chrome.scripting.executeScript as Mock).mockImplementation(async ({ target }: { target: { tabId: number } }) => {
    injected.add(target.tabId);
    return [];
  });
  (chrome.tabs.sendMessage as Mock).mockImplementation(async (tabId: number, message: { type?: string }) => {
    if (!injected.has(tabId)) throw new Error(NO_RECEIVER);
    return message.type === PING_MESSAGE_TYPE ? { ok: true } : { ok: true, answeredBy: "content script" };
  });
  return Object.assign(chrome, { __injected: injected });
}

describe("side panel → tab: sendToTab", () => {
  it("injects the content script into a LinkedIn tab that has none, then sends again", async () => {
    const chrome = tabWithoutContentScript();
    const res = await sendToTab(LINKEDIN_TAB, { type: "carouselabs:read-conversation" });
    expect(res).toEqual({ ok: true, answeredBy: "content script" });
    expect(chrome.scripting.executeScript).toHaveBeenCalledWith(freshImportOf(5));
  });

  it("imports the script under a new URL every time, so the tab can't reuse an old copy", async () => {
    const chrome = tabWithoutContentScript();
    await sendToTab(LINKEDIN_TAB, { type: "x" });
    (chrome.tabs.sendMessage as Mock).mockRejectedValueOnce(new Error(NO_RECEIVER));
    await new Promise((resolve) => setTimeout(resolve, 2)); // a later millisecond
    await sendToTab(LINKEDIN_TAB, { type: "x" });
    const urls = (chrome.scripting.executeScript as Mock).mock.calls.map(([arg]) => arg.args[0]);
    expect(urls).toHaveLength(2);
    expect(new Set(urls).size).toBe(2);
  });

  it("falls back to the manifest's own files for a build without a loader", async () => {
    const chrome = tabWithoutContentScript();
    (chrome.runtime.getManifest as Mock).mockReturnValue({
      content_scripts: [{ matches: ["https://www.linkedin.com/*"], js: [LOADER] }],
    });
    await sendToTab(LINKEDIN_TAB, { type: "x" });
    expect(chrome.scripting.executeScript).toHaveBeenCalledWith({ target: { tabId: 5 }, files: [LOADER] });
  });

  it("doesn't inject when the tab already answers", async () => {
    const chrome = chromeMock();
    (chrome.tabs.sendMessage as Mock).mockResolvedValue({ ok: true });
    expect(await sendToTab(LINKEDIN_TAB, { type: "x" })).toEqual({ ok: true });
    expect(chrome.scripting.executeScript).not.toHaveBeenCalled();
  });

  it("never injects outside LinkedIn: the original error comes back", async () => {
    const chrome = chromeMock();
    (chrome.tabs.sendMessage as Mock).mockRejectedValue(new Error(NO_RECEIVER));
    await expect(sendToTab(OTHER_TAB, { type: "x" })).rejects.toThrow(NO_RECEIVER);
    expect(chrome.scripting.executeScript).not.toHaveBeenCalled();
  });

  it("gives the original error back when injecting fails (a discarded tab, say)", async () => {
    const chrome = chromeMock();
    (chrome.tabs.sendMessage as Mock).mockRejectedValue(new Error(NO_RECEIVER));
    (chrome.scripting.executeScript as Mock).mockRejectedValue(new Error("Frame with ID 0 was removed."));
    await expect(sendToTab(LINKEDIN_TAB, { type: "x" })).rejects.toThrow(NO_RECEIVER);
  });

  it("only asks for a reload once repairing has failed, and only on LinkedIn", () => {
    expect(noContentScriptMessage(LINKEDIN_TAB, "Open LinkedIn first.")).toMatch(/Reload the page/);
    expect(noContentScriptMessage(OTHER_TAB, "Open LinkedIn first.")).toBe("Open LinkedIn first.");
  });
});

describe("side panel open: ensureContentScript", () => {
  it("puts a content script into the active LinkedIn tab when it has none", async () => {
    const chrome = tabWithoutContentScript();
    expect(await ensureContentScript(LINKEDIN_TAB)).toBe(true);
    expect(chrome.scripting.executeScript).toHaveBeenCalledTimes(1);
  });

  it("leaves a tab alone when its content script answers, and ignores other sites", async () => {
    const chrome = chromeMock();
    (chrome.tabs.sendMessage as Mock).mockResolvedValue({ ok: true });
    expect(await ensureContentScript(LINKEDIN_TAB)).toBe(true);
    expect(await ensureContentScript(OTHER_TAB)).toBe(false);
    expect(await ensureContentScript(undefined)).toBe(false);
    expect(chrome.scripting.executeScript).not.toHaveBeenCalled();
  });
});

describe("service worker: repairing open LinkedIn tabs", () => {
  const TABS = [
    { id: 1, url: "https://www.linkedin.com/feed/" },
    { id: 2, url: "https://www.linkedin.com/in/someone/", discarded: true },
    { id: 3, url: "https://www.linkedin.com/messaging/" },
  ];

  async function startWorker() {
    vi.resetModules();
    await import("@/background");
  }
  const injectedTabs = (chrome: ReturnType<typeof chromeMock>) =>
    (chrome.scripting.executeScript as Mock).mock.calls.map(([arg]) => arg.target.tabId).sort();

  it("on starting, gives every open LinkedIn tab without a working script a fresh one, skipping discarded tabs", async () => {
    const chrome = tabWithoutContentScript();
    (chrome.tabs.query as Mock).mockResolvedValue(TABS);
    await startWorker();
    await vi.waitFor(() => expect(injectedTabs(chrome)).toEqual([1, 3]));
    expect(chrome.tabs.query).toHaveBeenCalledWith({ url: "https://www.linkedin.com/*" });
    expect(chrome.scripting.executeScript).toHaveBeenCalledWith(freshImportOf(1));
  });

  it("leaves tabs whose script answers alone", async () => {
    const chrome = chromeMock();
    (chrome.tabs.query as Mock).mockResolvedValue(TABS);
    (chrome.tabs.sendMessage as Mock).mockResolvedValue({ ok: true });
    await startWorker();
    const [onInstalled] = [...chrome.runtime.onInstalled.listeners];
    onInstalled({ reason: "update" });
    await vi.waitFor(() => expect(chrome.tabs.sendMessage).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(chrome.scripting.executeScript).not.toHaveBeenCalled();
  });

  it("repairs again on an update, for a tab that lost its script after startup", async () => {
    const chrome = tabWithoutContentScript();
    (chrome.tabs.query as Mock).mockResolvedValue(TABS);
    await startWorker();
    await vi.waitFor(() => expect(injectedTabs(chrome)).toEqual([1, 3]));
    await new Promise((resolve) => setTimeout(resolve, 10)); // let the startup repair finish

    chrome.__injected.delete(1); // the update left tab 1 with a dead copy
    const [onInstalled] = [...chrome.runtime.onInstalled.listeners];
    onInstalled({ reason: "update" });
    await vi.waitFor(() => expect(injectedTabs(chrome)).toEqual([1, 1, 3]));
  });
});

describe("content script: one live copy per tab", () => {
  const commentButton = () => byFixture("post-1").querySelector<HTMLButtonElement>("button[aria-label^='Comment']")!;
  const handoffs = () =>
    chromeMock().__sentMessages.filter((m) => (m as { type?: string }).type === "carouselabs:post-selected");

  it("answers the side panel's ping", async () => {
    loadFixture("feed.html", "/feed/");
    await importContentScript({ config: SERVER_CONFIG });
    expect(await sendToContentScript({ type: PING_MESSAGE_TYPE })).toEqual({ ok: true });
  });

  it("a fresh copy replaces the one already in the tab: one click, one hand-off", async () => {
    loadFixture("feed.html", "/feed/");
    await importContentScript({ config: SERVER_CONFIG });
    await importContentScript({ config: SERVER_CONFIG });
    expect(chromeMock().runtime.onMessage.listeners.size).toBe(1);

    await click(commentButton());
    expect(handoffs()).toHaveLength(1);
    expect(await storedPost()).toMatchObject({ authorName: "Jane Doe" });
  });

  it("a copy cut off from the extension by an update stops handling clicks", async () => {
    loadFixture("feed.html", "/feed/");
    await importContentScript({ config: SERVER_CONFIG });
    const runtime = chromeMock().runtime as { id?: string };

    runtime.id = undefined; // what an orphaned content script sees
    await click(commentButton());
    expect(handoffs()).toHaveLength(0);

    runtime.id = "test-extension-id";
    await click(commentButton());
    expect(handoffs()).toHaveLength(0); // it tore itself down for good
    expect(await storedPost()).toBeUndefined();
  });
});
