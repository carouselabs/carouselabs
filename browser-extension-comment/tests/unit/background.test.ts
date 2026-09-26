import { describe, expect, it, vi } from "vitest";
import { chromeMock, deliverMessage } from "../setup/chrome";

const TOKEN = "cl_cmt_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const CONNECT_TAB = { id: 7, url: "https://carouselabs.com/extension-connect?x=1" } as chrome.tabs.Tab;

async function loadWorker() {
  vi.resetModules();
  await import("@/background");
}

function loggedText(spy: ReturnType<typeof vi.spyOn>): string {
  return spy.mock.calls.map((args: unknown[]) => args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ")).join("\n");
}

describe("service worker: token hand-off", () => {
  it("stores a token relayed from the sign-in page and closes that tab", async () => {
    await loadWorker();
    const res = await deliverMessage(chromeMock(), { type: "carouselabs:extension-token", token: TOKEN }, { tab: CONNECT_TAB, url: CONNECT_TAB.url });
    expect(res).toEqual({ ok: true });
    expect(chromeMock().__store.extensionToken).toBe(TOKEN);
    expect(chromeMock().tabs.remove).toHaveBeenCalledWith(7);
  });

  it("rejects a token message that did not come from the sign-in page", async () => {
    await loadWorker();
    const linkedinTab = { id: 3, url: "https://www.linkedin.com/feed/" } as chrome.tabs.Tab;
    await deliverMessage(chromeMock(), { type: "carouselabs:extension-token", token: TOKEN }, { tab: linkedinTab, url: linkedinTab.url });
    expect(chromeMock().__store.extensionToken).toBeUndefined();
    expect(chromeMock().tabs.remove).not.toHaveBeenCalled();
  });

  it("never writes the token to the console", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await loadWorker();
    await deliverMessage(chromeMock(), { type: "carouselabs:extension-token", token: TOKEN }, { tab: CONNECT_TAB, url: CONNECT_TAB.url });
    expect(loggedText(log)).not.toContain(TOKEN.slice(7));
  });

  it("does not echo other extension messages (captured posts) to the console", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await loadWorker();
    await deliverMessage(chromeMock(), { type: "carouselabs:post-selected", post: { text: "private DM text" } });
    expect(loggedText(log)).not.toContain("private DM text");
  });

  it("ignores messages that are not a token hand-off", async () => {
    await loadWorker();
    expect(await deliverMessage(chromeMock(), { type: "carouselabs:extension-token", token: 12 })).toBeUndefined();
    expect(await deliverMessage(chromeMock(), null)).toBeUndefined();
    expect(chromeMock().__store.extensionToken).toBeUndefined();
  });
});

describe("service worker: lifecycle", () => {
  it("opens the welcome page on first install only", async () => {
    await loadWorker();
    const [onInstalled] = [...chromeMock().runtime.onInstalled.listeners];
    onInstalled({ reason: "update" });
    expect(chromeMock().tabs.create).not.toHaveBeenCalled();
    onInstalled({ reason: "install" });
    expect(chromeMock().tabs.create).toHaveBeenCalledWith({ url: "chrome-extension://test-extension-id/welcome.html" });
  });

  it("relays the Generate shortcut to the side panel and nothing else", async () => {
    await loadWorker();
    const [onCommand] = [...chromeMock().commands.onCommand.listeners];
    onCommand("some-other-command");
    expect(chromeMock().runtime.sendMessage).not.toHaveBeenCalled();
    onCommand("generate-comment");
    expect(chromeMock().runtime.sendMessage).toHaveBeenCalledWith({ type: "carouselabs:shortcut-generate" }, expect.any(Function));
  });

  it("keeps no state in memory, so a worker restart loses nothing", async () => {
    await loadWorker();
    await deliverMessage(chromeMock(), { type: "carouselabs:extension-token", token: TOKEN }, { tab: CONNECT_TAB, url: CONNECT_TAB.url });
    await loadWorker(); // a fresh module instance is what a restarted worker is
    expect(chromeMock().__store.extensionToken).toBe(TOKEN);
  });
});
