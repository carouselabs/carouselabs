// Manifest V3 stops an extension's background service worker whenever it is
// idle (about 30 seconds) and starts a fresh one on the next event, so
// nothing the extension needs may live only in that worker's memory. Here the
// worker is stopped for real, through Chrome's DevTools protocol (the
// supported way to force it), and then the user carries on with the journeys
// that need the worker: signing in (the website hands the token to the
// worker, which stores it and closes the tab) and, on LinkedIn, the toolbar
// icon's "AI" badge on a conversation. Results are read from an extension
// page, which works without the old worker. Runs for whichever extension is
// loaded (EXT_DIST=dist, dist-store, dist-x or dist-x-store).
import type { CDPSession, Page } from "@playwright/test";
import { expect, test, type Harness } from "./harness";

const isX = /dist-x/.test(process.env.EXT_DIST ?? "dist");
const OWN_TOKEN = isX ? "carouselabs:x-extension-token" : "carouselabs:extension-token";

const HANDOFF_PAGE = `<!doctype html><html><body><p>Connecting…</p><script>
  window.post = (type, token) => window.postMessage({ type, token }, window.location.origin);
</script></body></html>`;

const workerRunning = async (cdp: CDPSession) =>
  (await cdp.send("Target.getTargets")).targetInfos.some(
    (t) => t.type === "service_worker" && t.url.startsWith("chrome-extension://"),
  );

// Stops the extension's worker the way Chrome does when it is idle.
async function stopWorker(harness: Harness, page: Page): Promise<CDPSession> {
  const cdp = await harness.context.newCDPSession(page);
  const worker = (await cdp.send("Target.getTargets")).targetInfos.find(
    (t) => t.type === "service_worker" && t.url.startsWith("chrome-extension://"),
  );
  expect(worker, "the extension's service worker is running").toBeTruthy();
  await cdp.send("Target.closeTarget", { targetId: worker!.targetId });
  await expect.poll(() => workerRunning(cdp)).toBe(false);
  return cdp;
}

// A page of the extension itself, to read its storage and badge without the
// old (stopped) worker.
async function extensionPage(harness: Harness): Promise<Page> {
  const id = new URL(harness.worker.url()).host;
  // Each extension's own side panel page, from its manifest.
  const panelPath = await harness.worker.evaluate(
    () => (chrome.runtime.getManifest() as { side_panel?: { default_path?: string } }).side_panel?.default_path ?? "",
  );
  const page = await harness.context.newPage();
  await page.goto(`chrome-extension://${id}/${panelPath}`);
  return page;
}

test("after Chrome stops the idle worker, signing in still stores the token and closes the hand-off tab", async ({ harness }) => {
  await harness.context.route("https://carouselabs.com/extension-connect**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: HANDOFF_PAGE }),
  );
  // Saved before the stop: a setting, which must survive it.
  await harness.worker.evaluate(() => chrome.storage.local.set({ theme: "dark" }));
  const reader = await extensionPage(harness);
  const cdp = await stopWorker(harness, reader);

  const page = await harness.context.newPage();
  const relayLoaded = page.waitForEvent("console", { predicate: (msg) => msg.text().startsWith("[authRelay] content script loaded") });
  await page.goto(`https://carouselabs.com/extension-connect${isX ? "?for=x" : ""}`);
  await relayLoaded;
  const closed = page.waitForEvent("close");
  await page.evaluate(([type]) => (window as unknown as { post: (t: string, k: string) => void }).post(type, "cl_cmt_after_stop"), [OWN_TOKEN]);

  // The relayed token woke a new worker, which stored it and closed the tab.
  await closed;
  expect(await workerRunning(cdp)).toBe(true);
  const saved = (await reader.evaluate(() => chrome.storage.local.get(["extensionToken", "theme"]))) as Record<string, unknown>;
  expect(saved).toEqual({ extensionToken: "cl_cmt_after_stop", theme: "dark" });
});

test("after Chrome stops the idle worker, a LinkedIn conversation still gets the toolbar's AI badge", async ({ harness }) => {
  test.skip(isX, "the LinkedIn extension's badge (X's is covered by xMessages)");
  const reader = await extensionPage(harness);
  await stopWorker(harness, reader);

  await harness.open("/messaging/thread/2-bharti/", "messaging-thread.html");
  const badge = () =>
    reader.evaluate(async () => {
      const [tab] = await chrome.tabs.query({ url: "https://www.linkedin.com/*" });
      return chrome.action.getBadgeText({ tabId: tab.id! });
    });
  await expect.poll(badge, { timeout: 15_000 }).toBe("AI");
});
